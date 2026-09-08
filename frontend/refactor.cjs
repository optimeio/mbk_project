const fs = require('fs');
let content = fs.readFileSync('src/portals/admin/TrainerDocuments.jsx', 'utf8');

// The components to extract
const startString = '  const getStatusTag = (status) => {';
const endString = '          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-8 text-center">\n            <InboxOutlined className="mb-3 text-4xl text-slate-300" />\n            <Text className="block text-sm font-medium text-slate-500">\n              No document found\n            </Text>\n            <Text className="mt-1 block text-xs text-slate-400">\n              Admin can upload on behalf of trainer\n            </Text>\n          </div>\n        )}\n      </div>\n    );\n  };';

const startIndex = content.indexOf(startString);
const endIndex = content.indexOf(endString) + endString.length;

if (startIndex !== -1 && endIndex > startIndex) {
    let components = content.substring(startIndex, endIndex);

    // Remove components from inner TrainerDocuments
    content = content.substring(0, startIndex) + '\n' + content.substring(endIndex);

    // Add handleDocumentUpload, handleVerifyDoc, setPreviewState props to DocPreview
    components = components.replace('const DocPreview = ({ doc, label, type }) => {', 'const DocPreview = ({ doc, label, type, handleDocumentUpload, handleVerifyDoc, setPreviewState }) => {');

    // Add to the top before TrainerDocuments
    const trainerDocumentsIndex = content.indexOf('const TrainerDocuments = () => {');
    if (trainerDocumentsIndex !== -1) {
        content = content.substring(0, trainerDocumentsIndex) + components + '\n\n' + content.substring(trainerDocumentsIndex);
    }

    // Now append props to all `<DocPreview` calls
    content = content.replace(/<DocPreview/g, '<DocPreview handleDocumentUpload={handleDocumentUpload} handleVerifyDoc={handleVerifyDoc} setPreviewState={setPreviewState}');

    fs.writeFileSync('src/portals/admin/TrainerDocuments.jsx', content);
    console.log('Success');
} else {
    console.log('Could not find components to extract');
}
