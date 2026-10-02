"""Generate the VAPID key pair for Web Push notifications.

    python scripts/generate_vapid_keys.py

Put the two printed values in VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (Render dashboard
or .env), plus VAPID_SUBJECT=mailto:<a contact address>. Keep the private key secret.
"""

import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def main() -> None:
    key = ec.generate_private_key(ec.SECP256R1())
    private = key.private_numbers().private_value.to_bytes(32, "big")
    public = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    print(f"VAPID_PUBLIC_KEY={b64url(public)}")
    print(f"VAPID_PRIVATE_KEY={b64url(private)}")


if __name__ == "__main__":
    main()
