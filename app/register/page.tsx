// Self-registration is disabled for the HBC admin panel.
// Accounts are created by a SuperAdmin via the Customers section.
// Any direct navigation to /register redirects to the login page.
import { redirect } from 'next/navigation';

export default function RegisterPage() {
  redirect('/');
}
