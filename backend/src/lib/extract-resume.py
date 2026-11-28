"""Read a bounded resume from stdin and emit text or DOCX structure observations."""
import io
import json
import os
import resource
import sys
from xml.parsers import expat
from zipfile import BadZipFile, ZipFile

WORD_NAMESPACES = (
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "http://purl.oclc.org/ooxml/wordprocessingml/main",
)
CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"


def reject_dtd(*_):
    raise ValueError("DTD")


def parse_xml(data, start, end=None, text=None):
    parser = expat.ParserCreate(namespace_separator=" ")
    parser.StartDoctypeDeclHandler = reject_dtd
    parser.StartElementHandler = start
    parser.EndElementHandler = end
    parser.CharacterDataHandler = text
    parser.Parse(data, True)


def docx_text(data, inspect=False):
    with ZipFile(io.BytesIO(data)) as archive:
        entries = archive.infolist()
        names = {entry.filename: entry for entry in entries}
        if len(entries) > 512 or len(names) != len(entries):
            raise ValueError("Archive entries")
        if sum(entry.file_size for entry in entries) > 30 * 1024 * 1024:
            raise ValueError("Archive size")
        if any(name.lower().endswith("/vbaproject.bin") for name in names):
            raise ValueError("Macros")

        def read_member(name, limit):
            if names[name].file_size > limit:
                raise ValueError("XML size")
            with archive.open(name) as stream:
                return stream.read(limit + 1)

        document_types = []

        def read_type(name, attributes):
            if (name == "http://schemas.openxmlformats.org/package/2006/content-types Override"
                    and attributes.get("PartName") == "/word/document.xml"):
                document_types.append(attributes.get("ContentType"))

        parse_xml(read_member("[Content_Types].xml", 65536), read_type)
        if document_types != [CONTENT_TYPE]:
            raise ValueError("Document type")

        parts = []
        size = 0
        depth = 0
        text_depth = None
        word_ns = None
        layout = {"tables": 0, "text_boxes": 0, "graphics": 0, "multi_column_sections": 0}

        def append(value):
            nonlocal size
            size += len(value)
            if size > 40000:
                raise ValueError("Extracted text size")
            parts.append(value)

        def start(name, attributes):
            nonlocal depth, word_ns, text_depth
            depth += 1
            if depth > 128:
                raise ValueError("XML nesting")
            if depth == 1:
                word_ns = next((ns for ns in WORD_NAMESPACES if name == ns + " document"), None)
                if word_ns is None:
                    raise ValueError("Document root")
            if name == word_ns + " t":
                text_depth = depth
            if name == word_ns + " tbl":
                layout["tables"] += 1
            if name == word_ns + " txbxContent":
                layout["text_boxes"] += 1
            if name in (word_ns + " drawing", word_ns + " pict", word_ns + " object"):
                layout["graphics"] += 1
            if name == word_ns + " cols" and attributes.get(word_ns + " num", "1") != "1":
                layout["multi_column_sections"] += 1
            if name in (word_ns + " tab", word_ns + " br", word_ns + " cr"):
                append("\t" if name.endswith(" tab") else "\n")

        def end(name):
            nonlocal depth, text_depth
            if depth == text_depth:
                text_depth = None
            if name == word_ns + " p":
                append("\n")
            depth -= 1

        def character_data(value):
            if text_depth == depth:
                append(value)

        parse_xml(read_member("word/document.xml", 2 * 1024 * 1024), start, end, character_data)
        text = "".join(parts)
        return json.dumps({"text": text, "layout": layout}, ensure_ascii=False) if inspect else text


def main():
    resource.setrlimit(resource.RLIMIT_CPU, (4, 4))
    resource.setrlimit(resource.RLIMIT_AS, (384 * 1024 * 1024, 384 * 1024 * 1024))
    if sys.argv[1] == "pdf":
        os.execvpe("pdftotext", ["pdftotext", "-f", "1", "-l", "30", "-enc", "UTF-8", "-nopgbrk", "-", "-"], os.environ)
    data = sys.stdin.buffer.read(5242881)
    if len(data) > 5242880:
        raise ValueError("Upload size")
    sys.stdout.buffer.write(docx_text(data, inspect="--inspect" in sys.argv[2:]).encode("utf-8"))


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError:
        sys.exit(3)
    except (BadZipFile, KeyError, MemoryError, NotImplementedError, OSError, RuntimeError, ValueError, expat.ExpatError):
        sys.exit(2)
