import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ServiceQuestionnaire from '../components/ServiceQuestionnaire';
import EstimateDisplay from '../components/EstimateDisplay';
import CustomerNavbar from '../components/CustomerNavbar';
import './CustomerHomeNew.css';

function CustomerHomeNew() {
  const navigate = useNavigate();
  const [serviceCatalogs, setServiceCatalogs] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [step, setStep] = useState(1); // 1: Select Service, 2: Questionnaire, 3: Estimate, 4: Schedule & Sort
  const [estimate, setEstimate] = useState(null);
  const [answers, setAnswers] = useState({});
  const [dateTime, setDateTime] = useState('');
  const [sortPreference, setSortPreference] = useState('nearby');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchServiceCatalogs();
  }, []);

  const fetchServiceCatalogs = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/service-catalogs`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch service catalogs');
      }
      
      const data = await response.json();
      setServiceCatalogs(data);
    } catch (error) {
      console.error('Error fetching service catalogs:', error);
      alert('Error loading services. Please try again.');
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleEstimateCalculated = (calculatedEstimate, serviceAnswers) => {
    setEstimate(calculatedEstimate);
    setAnswers(serviceAnswers);
    setStep(3);
  };

  const handleEstimateConfirm = () => {
    setStep(4);
  };

  const handleConfirmBooking = async () => {
    if (!dateTime) {
      alert('Please select preferred date and time');
      return;
    }

    setLoading(true);
    try {
      // Get customer location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please login to continue');
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/bookings/create-with-questionnaire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceCatalogId: selectedService._id,
          preferredDateTime: dateTime,
          serviceDetails: { answers, estimate },
          sortPreference,
          location
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if token expired
        if (response.status === 401) {
          alert('Session expired. Please login again.');
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        throw new Error(data.message || 'Error creating booking');
      }

      alert('Booking created! Finding providers for you...');
      navigate('/customer');

    } catch (error) {
      console.error('Booking error:', error);
      alert(error.message || 'Error creating booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-home-new">
      <CustomerNavbar />
      
      <div className="customer-home-container">
        {step === 1 && (
          <div className="services-section">
            <h1>What service do you need today?</h1>
            <p className="subtitle">Select a service to get started</p>
            
            <div className="services-grid">
              {serviceCatalogs.map(service => (
                <div 
                  key={service._id} 
                  className="service-catalog-card"
                  onClick={() => handleServiceSelect(service)}
                >
                  <span className="service-icon">{service.icon}</span>
                  <h3>{service.name}</h3>
                  <p className="category">{service.category}</p>
                  <p className="description">{service.description}</p>
                  <p className="starting-price">Starting from ₹{service.pricing.basePrice}</p>
                  <button className="btn-select-service">Select →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedService && (
          <div className="questionnaire-section">
            <button className="btn-back" onClick={() => setStep(1)}>
              ← Back to Services
            </button>
            <ServiceQuestionnaire
              service={selectedService}
              onEstimateCalculated={handleEstimateCalculated}
            />
          </div>
        )}

        {step === 3 && estimate && (
          <div className="estimate-section">
            <button className="btn-back" onClick={() => setStep(2)}>
              ← Back to Questions
            </button>
            <EstimateDisplay
              estimate={estimate}
              onConfirm={handleEstimateConfirm}
            />
          </div>
        )}

        {step === 4 && (
          <div className="schedule-section">
            <button className="btn-back" onClick={() => setStep(3)}>
              ← Back to Estimate
            </button>
            
            <div className="schedule-card">
              <h2>📅 Schedule Your Service</h2>

              <div className="estimate-summary-banner">
                <div className="summary-item">
                  <span className="label">Service:</span>
                  <span className="value">{selectedService.name}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Estimated Cost:</span>
                  <span className="value price">₹{estimate.total}</span>
                </div>
                <div className="summary-item payment-info">
                  <span>💳 Pay after service completion</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="datetime">Preferred Date & Time *</label>
                <input
                  id="datetime"
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
              </div>

              <div className="form-group">
                <label>How should we find your provider?</label>
                <div className="sort-options">
                  <label className={`sort-option ${sortPreference === 'nearby' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="sort"
                      value="nearby"
                      checked={sortPreference === 'nearby'}
                      onChange={(e) => setSortPreference(e.target.value)}
                    />
                    <span className="option-content">
                      <span className="icon">📍</span>
                      <span className="text">
                        <strong>Nearest Provider</strong>
                        <small>Fastest arrival time</small>
                      </span>
                    </span>
                  </label>

                  <label className={`sort-option ${sortPreference === 'rating' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="sort"
                      value="rating"
                      checked={sortPreference === 'rating'}
                      onChange={(e) => setSortPreference(e.target.value)}
                    />
                    <span className="option-content">
                      <span className="icon">⭐</span>
                      <span className="text">
                        <strong>Highest Rated</strong>
                        <small>Best reviews & ratings</small>
                      </span>
                    </span>
                  </label>

                  <label className={`sort-option ${sortPreference === 'mix' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="sort"
                      value="mix"
                      checked={sortPreference === 'mix'}
                      onChange={(e) => setSortPreference(e.target.value)}
                    />
                    <span className="option-content">
                      <span className="icon">🎯</span>
                      <span className="text">
                        <strong>Best Match</strong>
                        <small>Balanced rating & distance</small>
                      </span>
                    </span>
                  </label>

                  <label className={`sort-option ${sortPreference === 'cheapest' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="sort"
                      value="cheapest"
                      checked={sortPreference === 'cheapest'}
                      onChange={(e) => setSortPreference(e.target.value)}
                    />
                    <span className="option-content">
                      <span className="icon">💰</span>
                      <span className="text">
                        <strong>Cheapest Rate</strong>
                        <small>Lowest hourly rate</small>
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <button
                className="btn-confirm-booking"
                onClick={handleConfirmBooking}
                disabled={loading || !dateTime}
              >
                {loading ? 'Finding Provider...' : '🔍 Find Provider & Book'}
              </button>

              <p className="note">
                We'll automatically find the best available provider based on your preference
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerHomeNew;
