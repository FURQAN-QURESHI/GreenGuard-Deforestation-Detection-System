const mongoose = require('mongoose');

const AnalysisReportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    areaName: {
        type: String,
        default: 'Untitled Area'
    },
    coordinates: {
        type: Array,
        default: []
    },
    deforestation_geojson: {
        type: Object,
        default: null
    },
    before_image: {
        type: String,
        default: null
    },
    after_image: {
        type: String,
        default: null
    },
    total_area_km2: {
        type: Number,
        default: 0
    },
    deforested_area_km2: {
        type: Number,
        default: 0
    },
    deforestation_percentage: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    totalForestArea: {
        type: Number
    },
    deforestedArea: {
        type: Number
    },
    deforestationPercent: {
        type: Number
    },
    mapImageUrl: {
        type: String
    },
    isSubscribedToMonthlyUpdates: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AnalysisReport', AnalysisReportSchema);
