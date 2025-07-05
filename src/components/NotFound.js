import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1 style={{ fontSize: '3rem' }}>404 - Page Not Found</h1>
      <p style={{ fontSize: '1.2rem' }}>Oops! The page you’re looking for doesn’t exist.</p>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#0070f3',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '4px',
        }}
      >
        Go back to Home
      </Link>
    </div>
  );
}
