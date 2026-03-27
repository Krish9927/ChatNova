(async () => {
    try {
        const res = await fetch('http://localhost:3000/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName: 'Test User', email: 'test@example.com', password: 'password123' })
        });
        const text = await res.text();
        console.log('STATUS', res.status);
        console.log('BODY', text);
    } catch (err) {
        console.error('REQUEST ERROR', err);
    }
})();
