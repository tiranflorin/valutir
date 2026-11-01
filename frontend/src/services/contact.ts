const VITE_API_URL = import.meta.env.VITE_API_URL;

export type ContactSubmission = {
    email: string;
    message: string;
    website: string;
    turnstileToken: string;
};

export async function submitContactForm(payload: ContactSubmission): Promise<{ message: string }> {
    const response = await fetch(`${VITE_API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.message || 'Could not verify your message. Please try again.');
    }

    return data as { message: string };
}
