"""Read a bounded artifact ZIP without extracting files into any checkout."""

import base64
import io
import json
import stat
import sys
import unicodedata
import zipfile


def read_archive():
    limits = json.loads(sys.argv[1])
    for key in ("maxArchiveBytes", "maxExpandedBytes", "maxEntryBytes", "maxFiles"):
        if type(limits.get(key)) is not int or limits[key] <= 0:
            raise ValueError("resource limits required")
    raw = sys.stdin.buffer.read(limits["maxArchiveBytes"] + 1)
    if len(raw) > limits["maxArchiveBytes"]:
        raise ValueError("archive budget exceeded")
    entries = []
    seen = set()
    total = 0
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        infos = archive.infolist()
        if len(infos) > limits["maxFiles"]:
            raise ValueError("entry count exceeded")
        for info in infos:
            name = info.filename
            parts = name.rstrip("/").split("/")
            if (
                not name
                or name.startswith("/")
                or "\\" in name
                or ":" in name
                or any(ord(c) < 32 or ord(c) == 127 for c in name)
                or any(p in ("", ".", "..") for p in parts)
            ):
                raise ValueError("unsafe artifact path")
            key = unicodedata.normalize("NFC", name.rstrip("/")).casefold()
            if key in seen:
                raise ValueError("ambiguous artifact path")
            seen.add(key)
            kind = stat.S_IFMT(info.external_attr >> 16)
            if kind not in (0, stat.S_IFREG, stat.S_IFDIR) or info.flag_bits & 1:
                raise ValueError("unsupported archive entry")
            if info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                raise ValueError("unsupported compression")
            if info.is_dir():
                if info.file_size != 0 or kind == stat.S_IFREG:
                    raise ValueError("invalid directory")
                continue
            if kind == stat.S_IFDIR or info.file_size > limits["maxEntryBytes"]:
                raise ValueError("entry budget exceeded")
            total += info.file_size
            if total > limits["maxExpandedBytes"]:
                raise ValueError("expanded budget exceeded")
            with archive.open(info) as stream:
                body = stream.read(info.file_size + 1)
            if len(body) != info.file_size:
                raise ValueError("entry size differs")
            entries.append([name, base64.b64encode(body).decode("ascii")])
    return entries


if __name__ == "__main__":
    try:
        json.dump(read_archive(), sys.stdout, separators=(",", ":"), ensure_ascii=True)
    except Exception:
        # Do not forward archive paths, response URLs or private environment details.
        sys.exit("[artifact] invalid or unavailable ZIP")
