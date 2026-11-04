#!/usr/bin/env python3
"""Fallback for `zip -9 -q -r -y OUT.zip PATH...` when the zip CLI is missing.
Keeps symlinks as symlinks (needed for .app framework bundles) and preserves unix permissions."""
import os, sys, stat, zipfile
out, paths = sys.argv[1], sys.argv[2:]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    def add(p):
        st = os.lstat(p)
        if stat.S_ISLNK(st.st_mode):
            zi = zipfile.ZipInfo(p); zi.create_system = 3; zi.external_attr = (st.st_mode & 0xFFFF) << 16
            z.writestr(zi, os.readlink(p)); return
        if stat.S_ISDIR(st.st_mode):
            zi = zipfile.ZipInfo(p.rstrip('/') + '/'); zi.create_system = 3; zi.external_attr = ((st.st_mode & 0xFFFF) << 16) | 0x10
            z.writestr(zi, b'')
            for n in sorted(os.listdir(p)): add(os.path.join(p, n))
            return
        z.write(p, p)
    for p in paths: add(p)
