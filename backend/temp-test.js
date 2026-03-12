import { SarvamAIClient } from 'sarvamai';
import AdmZip from 'adm-zip';
import dotenv from 'dotenv';
dotenv.config();

const client = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });

async function test() {
  console.log('Testing Sarvam');
  try {
    const job = await client.documentIntelligence.createJob({
      language: 'hi-IN'
    });
    await job.uploadFile('dummy.pdf');
    await job.start();
    await job.waitUntilComplete();
    await job.downloadOutput('out.zip');
    
    const zip = new AdmZip('out.zip');
    console.log('Got files:');
    zip.getEntries().forEach(e => console.log(e.entryName));
    
    const json = zip.getEntries().find(e => e.entryName.endsWith('.json'));
    if (json) {
       console.log('JSON start:', zip.readAsText(json).substring(0, 500));
    }
  } catch (err) {
    console.error(err);
  }
}
test();
