import { adminMail, emailTo } from '../../core/config/config.js';
import sendEmail from '../../lib/sendEmail.js';
import { generateResponse } from '../../lib/responseFormate.js';

const ALLOWED_ISSUES = ['listing', 'marketing'];

export const submitContactForm = async (req, res) => {
  try {
    const { issue, description, email } = req.body || {};

    if (!issue || !ALLOWED_ISSUES.includes(issue)) {
      return generateResponse(
        res,
        400,
        false,
        `issue is required and must be one of: ${ALLOWED_ISSUES.join(', ')}`
      );
    }

    if (
      !description ||
      typeof description !== 'string' ||
      !description.trim()
    ) {
      return generateResponse(res, 400, false, 'description is required');
    }

    const targetEmail = adminMail || emailTo;
    if (!targetEmail) {
      return generateResponse(res, 500, false, 'Admin email is not configured');
    }

    const fromEmail = email || req.user?.email || 'noreply@saralemos.com';

    const html = `
      <div>
        <h3>New Contact Form Submission</h3>
        <p><strong>Issue:</strong> ${issue}</p>
        <p><strong>Description:</strong></p>
        <p>${description}</p>
        <p><strong>Reported by:</strong> ${fromEmail}</p>
      </div>
    `;

    const subject = `Contact Form: ${issue}`;

    const result = await sendEmail({ to: targetEmail, subject, html });

    if (!result.success) {
      return generateResponse(res, 500, false, 'Failed to send email');
    }

    return generateResponse(res, 200, true, 'Message sent successfully');
  } catch (err) {
    return generateResponse(res, 500, false, err.message);
  }
};
