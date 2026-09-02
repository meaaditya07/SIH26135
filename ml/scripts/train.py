"""Train and persist the placement prediction model.

Usage (from repo root):
    python -m ml.scripts.train
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
if REPO not in sys.path:
    sys.path.insert(0, REPO)

from ml.placement_model import train, save_model  # noqa: E402


def main() -> None:
    pipeline, metadata = train()
    path = save_model(pipeline, metadata)
    print(f"Saved placement model -> {path}")
    print(f"n_samples={metadata['n_samples']} "
          f"train_accuracy={metadata['train_accuracy']} "
          f"mean_prob={metadata['mean_predicted_probability']}")


if __name__ == "__main__":
    main()
