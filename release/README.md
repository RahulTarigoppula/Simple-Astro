# Vyomaphala for Android

`Vyomaphala-<version>.apk` is the signed, sideloadable Android build of the same app. Copy it to the phone, open it, and allow installs from that source once. Later versions install over it without losing anything, as long as they are signed with the same key.

`SHA256SUMS.txt` lets you check the file was not altered: `sha256sum -c SHA256SUMS.txt`.

How it is built is in the README under "Ship it". Once the four `ANDROID_*` secrets are set on GitHub, tagged versions are built by Actions and attached to the Release instead of being kept here.
