import torch
import segmentation_models_pytorch as smp
import os
import sys
import torch.nn as nn

# ─── Custom Attention U-Net Architecture ──────────
# This matches the custom trained weights with keys
# like e1.block.0.weight, e2.block.0.weight etc.

class DoubleConv(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Dropout(0.1),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True)
        )
    def forward(self, x):
        return self.block(x)

class AttentionGate(nn.Module):
    def __init__(self, F_g, F_l, F_int):
        super().__init__()
        self.W_g = nn.Sequential(
            nn.Conv2d(F_g, F_int, 1, bias=False),
            nn.BatchNorm2d(F_int)
        )
        self.W_x = nn.Sequential(
            nn.Conv2d(F_l, F_int, 1, bias=False),
            nn.BatchNorm2d(F_int)
        )
        self.psi = nn.Sequential(
            nn.Conv2d(F_int, 1, 1, bias=False),
            nn.BatchNorm2d(1),
            nn.Sigmoid()
        )
        self.relu = nn.ReLU(inplace=True)

    def forward(self, g, x):
        g1 = self.W_g(g)
        x1 = self.W_x(x)
        psi = self.relu(g1 + x1)
        psi = self.psi(psi)
        return x * psi

class CustomAttentionUNet(nn.Module):
    def __init__(self, in_channels=14, out_channels=1):
        super().__init__()
        # Encoder
        self.e1 = DoubleConv(in_channels, 64)
        self.e2 = DoubleConv(64, 128)
        self.e3 = DoubleConv(128, 256)
        self.e4 = DoubleConv(256, 512)
        # Bottleneck
        self.bn = DoubleConv(512, 1024)
        # Pooling
        self.pool = nn.MaxPool2d(2)
        # Decoder upsampling
        self.u4 = nn.ConvTranspose2d(1024, 512, 2, 2)
        self.u3 = nn.ConvTranspose2d(512, 256, 2, 2)
        self.u2 = nn.ConvTranspose2d(256, 128, 2, 2)
        self.u1 = nn.ConvTranspose2d(128, 64, 2, 2)
        # Attention gates
        self.a4 = AttentionGate(512, 512, 256)
        self.a3 = AttentionGate(256, 256, 128)
        self.a2 = AttentionGate(128, 128, 64)
        self.a1 = AttentionGate(64, 64, 32)
        # Decoder convs
        self.d4 = DoubleConv(1024, 512)
        self.d3 = DoubleConv(512, 256)
        self.d2 = DoubleConv(256, 128)
        self.d1 = DoubleConv(128, 64)
        # Output
        self.out = nn.Conv2d(64, out_channels, 1)

    def forward(self, x):
        e1 = self.e1(x)
        e2 = self.e2(self.pool(e1))
        e3 = self.e3(self.pool(e2))
        e4 = self.e4(self.pool(e3))
        
        bn = self.bn(self.pool(e4))
        
        d4 = self.u4(bn)
        e4_a = self.a4(d4, e4)
        d4 = self.d4(torch.cat([d4, e4_a], dim=1))

        d3 = self.u3(d4)
        e3_a = self.a3(d3, e3)
        d3 = self.d3(torch.cat([d3, e3_a], dim=1))

        d2 = self.u2(d3)
        e2_a = self.a2(d2, e2)
        d2 = self.d2(torch.cat([d2, e2_a], dim=1))

        d1 = self.u1(d2)
        e1_a = self.a1(d1, e1)
        d1 = self.d1(torch.cat([d1, e1_a], dim=1))

        return self.out(d1)

# ─── Main Load Function ───────────────────────────

def load_model(model_path):
    if not os.path.exists(model_path):
        sys.stderr.write(
            f"Model file not found: {model_path}\n"
        )
        return None

    filename = os.path.basename(model_path).lower()

    try:
        raw = torch.load(
            model_path, 
            map_location=torch.device('cpu')
        )
        if isinstance(raw, dict):
            if 'model' in raw:
                state_dict = raw['model']
            elif 'state_dict' in raw:
                state_dict = raw['state_dict']
            else:
                state_dict = raw
        else:
            state_dict = raw

        if "attention_unet" in filename:
            model = CustomAttentionUNet(
                in_channels=14,
                out_channels=1
            )
        elif "deeplabv3plus" in filename:
            model = smp.DeepLabV3Plus(
                encoder_name="resnet34",
                encoder_weights=None,
                in_channels=14,
                classes=1
            )
        elif "unetplusplus" in filename:
            model = smp.UnetPlusPlus(
                encoder_name="resnet34",
                encoder_weights=None,
                in_channels=14,
                classes=1
            )
        else:
            model = smp.DeepLabV3Plus(
                encoder_name="resnet34",
                encoder_weights=None,
                in_channels=14,
                classes=1
            )

        model.load_state_dict(state_dict, strict=True)
        model.eval()
        sys.stderr.write(
            f"Loaded successfully: {filename}\n"
        )
        return model

    except Exception as e:
        sys.stderr.write(
            f"Error loading {filename}: {e}\n"
        )
        return None
