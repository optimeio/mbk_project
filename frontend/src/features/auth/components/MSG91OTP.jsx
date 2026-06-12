"use client";

import { useState } from 'react';

const MSG91OTP = ({ onSuccess, onFailure }) => {
    const [mobile, setMobile] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('INPUT_MOBILE'); // INPUT_MOBILE, INPUT_OTP
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSendOTP = async () => {
        if (!mobile || mobile.length < 10) {
            setMessage('Please enter a valid mobile number.');
            return;
        }

        setIsLoading(true);
        setMessage('Sending OTP...');

        try {
            const response = await fetch('/api/auth/send-msg91-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile })
            });
            const data = await response.json();

            if (data.success) {
                setStep('INPUT_OTP');
                setMessage('OTP Sent Successfully. Please check your text messages.');
            } else {
                setMessage(data.message || 'Failed to send OTP.');
            }
        } catch (err) {
            console.error(err);
            setMessage('Network error. Failed to send OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp || otp.length < 4) {
            setMessage('Please enter the OTP.');
            return;
        }

        setIsLoading(true);
        setMessage('Verifying...');

        try {
            const response = await fetch('/api/auth/verify-msg91-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile, otp })
            });
            const data = await response.json();

            if (data.success) {
                setMessage('Verified Successfully!');
                if (onSuccess) onSuccess(data);
            } else {
                setMessage(data.message || 'Invalid OTP.');
                if (onFailure) onFailure(data);
            }
        } catch (err) {
            console.error(err);
            setMessage('Network error. Failed to verify OTP.');
            if (onFailure) onFailure(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ padding: '0px', maxWidth: '300px', margin: '0 0' }}>

            {step === 'INPUT_MOBILE' && (
                <div style={{ marginBottom: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Enter Mobile Number (with country code)"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '5px',
                            color: 'white',
                            marginBottom: '10px'
                        }}
                    />
                    <button
                        onClick={handleSendOTP}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: isLoading ? '#555' : '#00ffff',
                            color: isLoading ? '#ccc' : '#000',
                            border: 'none',
                            borderRadius: '5px',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                </div>
            )}

            {step === 'INPUT_OTP' && (
                <div style={{ marginBottom: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '5px',
                            color: 'white',
                            marginBottom: '10px'
                        }}
                    />
                    <button
                        onClick={handleVerifyOTP}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: isLoading ? '#555' : '#00e676',
                            color: isLoading ? '#ccc' : '#000',
                            border: 'none',
                            borderRadius: '5px',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <div style={{ marginTop: '10px', textAlign: 'right' }}>
                        <span
                            onClick={() => setStep('INPUT_MOBILE')}
                            style={{ color: '#00ffff', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Change Number
                        </span>
                    </div>
                </div>
            )}

            {message && (
                <div style={{
                    marginTop: '10px',
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: message.includes('Success') ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)',
                    color: message.includes('Success') ? '#aaffaa' : '#ffaaaa',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                }}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default MSG91OTP;
