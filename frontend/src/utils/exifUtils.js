/**
 * Client-side utility to detect EXIF GPS metadata in JPEG files.
 * This helps warn trainers BEFORE they upload unverifiable images.
 */

/**
 * Detects if a JPEG file has EXIF GPS metadata.
 * @param {File} file The file to check.
 * @returns {Promise<{ hasGps: boolean, hasDate: boolean, isJpeg: boolean, error?: string }>}
 */
export const detectExifGps = async (file) => {
    if (!file) return { hasGps: false, hasDate: false, isJpeg: false };

    const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
    
    if (!isJpeg) {
        return { hasGps: false, hasDate: false, isJpeg: false };
    }

    try {
        // Read the first 64KB - usually enough for EXIF
        const buffer = await readFileAsArrayBuffer(file.slice(0, 65536));
        const view = new DataView(buffer);

        // Check JPEG SOI (FF D8)
        if (view.getUint16(0) !== 0xFFD8) {
            return { hasGps: false, hasDate: false, isJpeg: false, error: 'Not a valid JPEG SOI' };
        }

        let offset = 2;
        while (offset < view.byteLength - 2) {
            // Find marker (FF xx)
            if (view.getUint8(offset) !== 0xFF) {
                offset++;
                continue;
            }

            const marker = view.getUint8(offset + 1);
            if (marker === 0xD9 || marker === 0xDA) break; // End of image or start of scan

            const length = view.getUint16(offset + 2);
            
            // APP1 marker (FF E1) is where EXIF resides
            if (marker === 0xE1) {
                const header = getString(view, offset + 4, 4);
                if (header === 'Exif') {
                    const metadata = detectExifMetadata(view, offset + 10);
                    return { ...metadata, isJpeg: true };
                }
            }

            offset += 2 + length;
        }

        return { hasGps: false, hasDate: false, isJpeg: true };
    } catch (error) {
        console.error('Error detecting EXIF GPS:', error);
        return { hasGps: false, hasDate: false, isJpeg: true, error: error.message };
    }
};

const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

const getString = (view, offset, length) => {
    let str = '';
    for (let i = 0; i < length; i++) {
        str += String.fromCharCode(view.getUint8(offset + i));
    }
    return str;
};

const detectExifMetadata = (view, tiffStart) => {
    let hasGps = false;
    let hasDate = false;

    try {
        const byteOrder = view.getUint16(tiffStart);
        const littleEndian = byteOrder === 0x4949; // 'II'
        
        if (byteOrder !== 0x4949 && byteOrder !== 0x4D4D) return { hasGps, hasDate };

        if (getUint16(view, tiffStart + 2, littleEndian) !== 0x002A) return { hasGps, hasDate };

        const ifd0Offset = getUint32(view, tiffStart + 4, littleEndian);
        const ifd0AbsoluteOffset = tiffStart + ifd0Offset;
        const ifd0Entries = readIfdEntries(view, ifd0AbsoluteOffset, littleEndian);

        for (const entry of ifd0Entries) {
            const tag = entry.tag;
            if (tag === 0x8825) {
                hasGps = true;
            }
            if (tag === 0x0132) {
                hasDate = true;
            }
            if (tag === 0x8769 && Number.isFinite(entry.valueOffset) && entry.valueOffset > 0) {
                const exifIfdEntries = readIfdEntries(view, tiffStart + entry.valueOffset, littleEndian);
                for (const exifEntry of exifIfdEntries) {
                    if (exifEntry.tag === 0x9003 || exifEntry.tag === 0x9004) {
                        hasDate = true;
                    }
                }
            }
        }
    } catch (error) {
        return { hasGps, hasDate, error: error.message };
    }

    return { hasGps, hasDate };
};

const readIfdEntries = (view, absoluteIfdOffset, littleEndian) => {
    if (!Number.isFinite(absoluteIfdOffset) || absoluteIfdOffset < 0 || absoluteIfdOffset + 2 > view.byteLength) {
        return [];
    }

    const entryCount = getUint16(view, absoluteIfdOffset, littleEndian);
    const entries = [];
    for (let i = 0; i < entryCount; i++) {
        const entryOffset = absoluteIfdOffset + 2 + (i * 12);
        if (entryOffset + 12 > view.byteLength) break;
        entries.push({
            tag: getUint16(view, entryOffset, littleEndian),
            valueOffset: getUint32(view, entryOffset + 8, littleEndian),
        });
    }
    return entries;
};

const getUint16 = (view, offset, littleEndian) => view.getUint16(offset, littleEndian);
const getUint32 = (view, offset, littleEndian) => view.getUint32(offset, littleEndian);
