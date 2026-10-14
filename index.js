import express from 'express';
import path from 'path';
import { chromium } from 'playwright';

const app = express();
app.use(express.json());

const PROFILE = {
  firstName: 'Saurabh',
  lastName: 'Singh',
  fullName: 'Saurabh Singh',
  email: 'saurabh5532u@gmail.com',
  phone: '6396118274',
  city: 'Firozabad, Uttar Pradesh, India',
  linkedin: 'https://www.linkedin.com/in/saurabh2445',
  github: 'https://github.com/saurabh24thakur/',
  leetcode: 'https://leetcode.com/u/saurabhsingh24/'
};

app.post('/apply', async (req, res) => {
  const { jobUrl, company, jobTitle, fileName } = req.body;
  
  if (!jobUrl) {
    console.error('❌ [ERROR] Missing jobUrl.');
    return res.status(400).json({ status: 'Failed', error: 'Missing jobUrl' });
  }

  // Acknowledge n8n immediately so the connection never drops
  res.status(200).json({ status: 'Accepted', message: 'Agent started processing in background' });

  const targetResume = fileName || 'Saurabh_Singh_GROWLOC_Resume.pdf';
  const resumePath = path.resolve('uploads', targetResume);

  console.log(`\n==================================================`);
  console.log(`🚀 [TASK RECEIVED] Applying to: ${company || 'Unknown'}`);
  console.log(`🔗 [URL]: ${jobUrl}`);
  console.log(`📄 [RESUME]: ${resumePath}`);
  console.log(`==================================================`);

  // Run Playwright automation in the background
  setImmediate(async () => {
    let context;
    try {
      context = await chromium.launchPersistentContext('./linkedin_session', {
        headless: false,
        viewport: { width: 1280, height: 800 }
      });

      const page = await context.newPage();
      await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);

      let activePage = page;

      if (jobUrl.includes('linkedin.com/jobs')) {
        const easyApplyBtn = page.locator('button.jobs-apply-button:has-text("Easy Apply")').first();
        const externalApplyBtn = page.locator('button.jobs-apply-button:has-text("Apply")').first();

        if (await easyApplyBtn.count() > 0 && await easyApplyBtn.isVisible()) {
          console.log('✨ [ACTION] Clicking LinkedIn "Easy Apply"...');
          await easyApplyBtn.click();
          await page.waitForTimeout(2000);

          for (let step = 1; step <= 6; step++) {
            const fileInput = page.locator('input[type="file"]').first();
            if (await fileInput.count() > 0) {
              console.log(`📎 [UPLOAD] Attaching resume file: ${resumePath}`);
              await fileInput.setInputFiles(resumePath);
              await page.waitForTimeout(1500);
            }

            const submitBtn = page.locator('button[aria-label*="Submit application" i]').first();
            if (await submitBtn.count() > 0 && await submitBtn.isVisible()) {
              console.log('🚀 [SUBMIT] Submitting application...');
              await submitBtn.click();
              await page.waitForTimeout(4000);
              console.log(`✅ [SUCCESS] Submitted successfully!`);
              await context.close();
              return;
            }

            const nextBtn = page.locator('button[aria-label*="Continue to next step" i], button[aria-label*="Review your application" i]').first();
            if (await nextBtn.count() > 0 && await nextBtn.isVisible()) {
              await nextBtn.click();
              await page.waitForTimeout(2000);
            } else {
              break;
            }
          }
        } else if (await externalApplyBtn.count() > 0 && await externalApplyBtn.isVisible()) {
          console.log('🔗 [ACTION] Opening external portal...');
          const [newTab] = await Promise.all([
            context.waitForEvent('page'),
            externalApplyBtn.click()
          ]);
          await newTab.waitForLoadState('domcontentloaded');
          activePage = newTab;
        }
      }

      const fileInput = activePage.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(resumePath);
      }

      const fillField = async (selector, val) => {
        const el = activePage.locator(selector).first();
        if (await el.count() > 0 && await el.isVisible()) {
          await el.fill(val);
        }
      };

      await fillField('input[name*="first_name" i]', PROFILE.firstName);
      await fillField('input[name*="last_name" i]', PROFILE.lastName);
      await fillField('input[name="name" i]', PROFILE.fullName);
      await fillField('input[type="email"]', PROFILE.email);
      await fillField('input[type="tel"]', PROFILE.phone);
      await fillField('input[name*="linkedin" i]', PROFILE.linkedin);

      const submitExternal = activePage.locator('button[type="submit"], button:has-text("Submit Application")').first();
      if (await submitExternal.count() > 0 && await submitExternal.isVisible()) {
        await submitExternal.click();
        await activePage.waitForTimeout(4000);
        console.log(`✅ [SUCCESS] External application submitted!`);
      }

      await context.close();
    } catch (err) {
      console.error(`❌ [ERROR]:`, err.message);
      if (context) try { await context.close(); } catch (e) {}
    }
  });
});

app.listen(3001, () => {
  console.log('🤖 ==================================================');
  console.log('🤖 Saurabh Auto-Applier Agent is running & listening');
  console.log('🤖 Endpoint: http://localhost:3001/apply');
  console.log('🤖 ==================================================');
});