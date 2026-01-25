import express from 'express';
import { submitContactForm } from './contact.controller.js';

const router = express.Router();

// POST /v1/contact
router.post('/', submitContactForm);

export default router;
