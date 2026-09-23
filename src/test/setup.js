import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import i18n from '../i18n/i18n';

// jsdom's default navigator.language (en-US) can steer the language detector
// to English - pin the app's primary language (Turkish) so tests give the
// same result in every environment.
i18n.changeLanguage('tr');

// Clean up the rendered DOM after each test, otherwise tests in the same file
// see each other's elements and fail with a "multiple matches" error.
afterEach(cleanup);

// jsdom doesn't implement scrollIntoView; AiChatDrawer calls it whenever its
// message list changes.
Element.prototype.scrollIntoView = vi.fn();
