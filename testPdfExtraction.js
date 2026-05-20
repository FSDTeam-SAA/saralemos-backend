import dotenv from 'dotenv';
dotenv.config();

import { extractPdfData } from './src/lib/adobeExtract.js';

async function testPdfExtraction() {
    try {
        console.log('🚀 Starting PDF Extraction Test...\n');

        const pdfPath = '/home/jarif/Downloads/BF 2023-Nimbus-T11.pdf';

        console.log(`📄 PDF Path: ${pdfPath}`);
        console.log('⏳ Processing PDF...\n');

        const result = await extractPdfData(pdfPath);

        console.log('✅ Extraction Successful!\n');

        // Display extracted text
        console.log('📝 EXTRACTED TEXT:');
        console.log('='.repeat(80));
        console.log(result.extractedText.substring(0, 2000)); // First 2000 chars
        if (result.extractedText.length > 2000) {
            console.log(`\n... (${result.extractedText.length - 2000} more characters)\n`);
        }

        // Display image information
        console.log('\n📸 EXTRACTED IMAGES:');
        console.log('='.repeat(80));
        console.log(`Found ${result.images.length} image(s)`);
        result.images.forEach((img, idx) => {
            console.log(`  ${idx + 1}. ${img.name} (${img.buffer.length} bytes)`);
        });

        // Display structured data
        console.log('\n🗂️ STRUCTURED DATA:');
        console.log('='.repeat(80));
        console.log(`Total elements: ${result.structured.elements?.length || 0}`);
        if (result.structured.elements) {
            console.log('\nFirst 5 elements:');
            result.structured.elements.slice(0, 5).forEach((el, idx) => {
                console.log(`  ${idx + 1}. ${JSON.stringify(el).substring(0, 100)}...`);
            });
        }

        // Summary stats
        console.log('\n📊 SUMMARY:');
        console.log('='.repeat(80));
        console.log(`Text Length: ${result.extractedText.length} characters`);
        console.log(`Images Found: ${result.images.length}`);
        console.log(`Structured Elements: ${result.structured.elements?.length || 0}`);

    } catch (error) {
        console.error('❌ Error during PDF Extraction:');
        console.error(error.message);
        if (error.response?.data) {
            console.error('API Response:', error.response.data);
        }
    }
}

testPdfExtraction();
