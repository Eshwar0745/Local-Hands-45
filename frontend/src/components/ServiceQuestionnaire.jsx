import React, { useState } from 'react';
import './ServiceQuestionnaire.css';

function ServiceQuestionnaire({ service, onEstimateCalculated }) {
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear error for this field
    if (errors[questionId]) {
      setErrors(prev => ({ ...prev, [questionId]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    service.questions.forEach(q => {
      if (q.required && !answers[q.id]) {
        newErrors[q.id] = 'This field is required';
      }
      if (q.required && Array.isArray(answers[q.id]) && answers[q.id].length === 0) {
        newErrors[q.id] = 'Please select at least one option';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please login to continue');
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/bookings/calculate-estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceCatalogId: service._id,
          answers
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Check if token expired
        if (response.status === 401) {
          alert('Session expired. Please login again.');
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        throw new Error(data.message || 'Error calculating estimate');
      }
      
      onEstimateCalculated(data.estimate, answers);
    } catch (error) {
      console.error('Error calculating estimate:', error);
      alert('Error calculating estimate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = (question) => {
    const value = answers[question.id] || '';
    const error = errors[question.id];

    switch (question.type) {
      case 'radio':
        return (
          <div key={question.id} className="question-block">
            <label className="question-label">
              {question.question} {question.required && <span className="required">*</span>}
            </label>
            <div className="radio-group">
              {question.options.map(option => (
                <label key={option} className="radio-option">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {error && <span className="error-text">{error}</span>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={question.id} className="question-block">
            <label className="question-label">
              {question.question} {question.required && <span className="required">*</span>}
            </label>
            <div className="checkbox-group">
              {question.options.map(option => (
                <label key={option} className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={(value || []).includes(option)}
                    onChange={(e) => {
                      const current = value || [];
                      const updated = e.target.checked
                        ? [...current, option]
                        : current.filter(v => v !== option);
                      handleInputChange(question.id, updated);
                    }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {error && <span className="error-text">{error}</span>}
          </div>
        );

      case 'number':
        return (
          <div key={question.id} className="question-block">
            <label className="question-label">
              {question.question} {question.required && <span className="required">*</span>}
            </label>
            <input
              type="number"
              min={question.min}
              max={question.max}
              value={value}
              onChange={(e) => handleInputChange(question.id, parseInt(e.target.value) || '')}
              placeholder={question.placeholder}
              className="number-input"
            />
            {error && <span className="error-text">{error}</span>}
          </div>
        );

      case 'text':
        return (
          <div key={question.id} className="question-block">
            <label className="question-label">
              {question.question} {question.required && <span className="required">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              className="text-input"
              rows="3"
            />
            {error && <span className="error-text">{error}</span>}
          </div>
        );

      case 'select':
        return (
          <div key={question.id} className="question-block">
            <label className="question-label">
              {question.question} {question.required && <span className="required">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              className="select-input"
            >
              <option value="">-- Select --</option>
              {question.options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {error && <span className="error-text">{error}</span>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="service-questionnaire">
      <div className="questionnaire-header">
        <h3>{service.icon} {service.name}</h3>
        <p className="subtitle">Please answer a few questions to get an accurate price estimate</p>
      </div>
      
      <div className="questions-container">
        {service.questions.map(renderQuestion)}
      </div>
      
      <button 
        type="submit" 
        className="btn-calculate-estimate"
        disabled={loading}
      >
        {loading ? 'Calculating...' : '📊 Get Instant Estimate'}
      </button>
    </form>
  );
}

export default ServiceQuestionnaire;
