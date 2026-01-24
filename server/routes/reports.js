const express = require('express');
const router = express.Router();
const AnalysisReport = require('../models/AnalysisReport');
// Middleware to verify token would go here

const { spawn } = require('child_process');
const path = require('path');

// @route   POST api/reports/analyze
// @desc    Trigger deforestation analysis via Python script
// @access  Private (or Public for demo)
router.post('/analyze', async (req, res) => {
    try {
        const { coordinates, range1, range2 } = req.body;

        // Prepare data for Python script
        const inputData = JSON.stringify({ coordinates, range1, range2 });

        const scriptPath = path.join(__dirname, '../python/inference.py');
        const os = require('os');
        const isWindows = os.platform() === 'win32';
        const venvPython = isWindows
          ? path.join(__dirname, '../python/venv_gg/Scripts/python.exe')
          : path.join(__dirname, '../python/venv_gg/bin/python');

        const pythonProcess = spawn(venvPython, [scriptPath, inputData]);

        let resultData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}:`);
                console.error(`STDERR: ${errorData}`);
                console.error(`STDOUT: ${resultData}`);
                return res.status(500).json({ msg: 'Analysis Failed', error: errorData || resultData });
            }
            try {
                const jsonResult = JSON.parse(resultData);
                res.json(jsonResult);
            } catch (e) {
                console.error('Failed to parse Python output:', resultData);
                res.status(500).json({ msg: 'Invalid Analysis Output' });
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

const auth = require('../middleware/auth');

// @route   POST api/reports
// @desc    Save a new analysis report
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        console.log("Saving report for user:", req.user.id);
        const reportData = { ...req.body, userId: req.user.id };
        const newReport = new AnalysisReport(reportData);
        const report = await newReport.save();
        console.log("Report saved successfully:", report._id);
        res.json(report);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/reports
// @desc    Get all reports for load-in user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        console.log("GET /reports called for user:", req.user.id);
        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(req.user.id);
        const reports = await AnalysisReport.find({ userId: userObjectId }).sort({ createdAt: -1 });
        console.log(`Found ${reports.length} reports for user.`);
        res.json(reports);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/reports/:id
// @desc    Update a report (e.g. rename)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const { areaName } = req.body;

        let report = await AnalysisReport.findById(req.params.id);
        if (!report) return res.status(404).json({ msg: 'Report not found' });

        // Ensure user owns report
        if (report.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        if (areaName) report.areaName = areaName;

        await report.save();
        res.json(report);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/reports/:id
// @desc    Delete a report
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const report = await AnalysisReport.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ msg: 'Report not found' });
        }

        // Check user
        if (report.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await report.deleteOne();

        res.json({ msg: 'Report removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Report not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;

// feat(reports): add /analyze endpoint that spawns Python process

// refactor(reports): extract Python spawn into helper

// fix(reports): handle Python stderr properly on non-zero exit

// fix(server): correct path resolution for venv Python on Windows

// feat(reports): add PUT route to rename reports

// feat(reports): add authorization check on PUT and DELETE

// feat(reports): return reports sorted by createdAt desc

// fix(reports): handle ObjectId cast errors on DELETE

// fix(reports): prevent duplicate report names per user

// /analyze spawns python

// extract python spawn helper

// PUT to rename reports

// handle ObjectId cast on DELETE

// prevent duplicate report names

// include mask URL + area

// improve error messaging

// better error logs

// add request validation
