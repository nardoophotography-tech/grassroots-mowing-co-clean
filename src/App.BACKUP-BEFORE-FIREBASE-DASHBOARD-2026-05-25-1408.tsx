import { useState } from 'react';
import './index.css';

function App() {
  // State to hold the form data
  const [siteAddress, setSiteAddress] = useState('');
  const [hazardTypes, setHazardTypes] = useState<string[]>(['heavy_clearing']);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  // Function to send data to the backend server
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionStatus('submitting');

    try {
      // Send the data to the server backend on the same origin
      const response = await fetch('/api/book-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteAddress, hazardTypes }),
      });

      if (response.ok) {
        setSubmissionStatus('success');
        setSiteAddress(''); // Clear the form
        
        // Reset the success message after 5 seconds
        setTimeout(() => setSubmissionStatus('idle'), 5000);
      } else {
        throw new Error('Server rejected the request');
      }
    } catch (error) {
      console.error('Dispatch error:', error);
      alert('Could not reach the dispatch server. Ensure it is running on port 8080.');
      setSubmissionStatus('idle');
    }
  };

  // Helper to handle multiple select options
  const handleHazardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    setHazardTypes(selected);
  };

  return (
    <div className="grassroots-app-container">

      {/* LAYER 1: Deep Background (The Foundation) */}
      <img 
        src="/assets/custom-3d-roots-bg.webp" 
        className="artwork-root-bg" 
        alt="Subtle background root watermark" 
      />

      {/* LAYER 2 & 3: Midground UI and Dave Foreground */}
      <main className="ui-booking-card">
        
        {/* Dave's Cutout Image (Leaning on the form) */}
        <img 
          src="/assets/dave-cutout.png" 
          className="dave-cutout" 
          alt="Dave - Lead Operator, GrassRoots Mowing Co." 
        />
        
        <header className="grassroots-header">
          <h1 className="font-block-display">GrassRoots Mowing Co.</h1>
          <h2 className="font-block-subtitle">Project #156: Mt Isa Hazard Reduction</h2>
          
          <div className="dave-intro-badge">
             <p>
               "G'day, I'm Dave. Fill out the details below, and I'll personally review your site for our next sponsor-funded assessment."
             </p>
          </div>
        </header>

        <section className="project-details">
          {/* The Active Booking Form */}
          <form className="project-156-form" onSubmit={handleBookingSubmit}>
             <div className="form-group">
                <label>Site Address</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., 12-14 Railway Ave, Mt Isa QLD 4825" 
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  disabled={submissionStatus === 'submitting'}
                />
             </div>
             
             <div className="form-group">
                <label>Hazard Type</label>
                <select 
                  multiple 
                  value={hazardTypes}
                  onChange={handleHazardChange}
                  disabled={submissionStatus === 'submitting'}
                >
                    <option value="heavy_clearing">Heavy Clearing Required</option>
                    <option value="fire_hazard">Fine Fuel / Fire Hazard</option>
                    <option value="erosion">Erosion Potential</option>
                </select>
             </div>

             <button 
                type="submit" 
                disabled={submissionStatus === 'submitting' || submissionStatus === 'success'}
                style={{
                  backgroundColor: submissionStatus === 'success' ? 'var(--foliage-green)' : 'var(--grassroots-ochre)'
                }}
              >
                {submissionStatus === 'idle' && 'Request Sponsor-Funded Assessment'}
                {submissionStatus === 'submitting' && 'Transmitting Data...'}
                {submissionStatus === 'success' && 'Assessment Requested!'}
             </button>
          </form>
        </section>

        {/* About the Operator Section */}
        <section className="operator-bio" style={{ 
            marginTop: '4rem', 
            display: 'flex', 
            gap: '2rem', 
            alignItems: 'center', 
            backgroundColor: 'var(--off-white-paper)', 
            padding: '2rem', 
            borderTop: '2px solid var(--grassroots-dust)' 
        }}>
          
          <img 
            src="/assets/dave-bio-shot.jpg" 
            alt="Dave onsite with equipment in Mt Isa" 
            style={{ width: '250px', borderRadius: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
          />
          
          <div className="bio-text">
            <h3 style={{ color: 'var(--grassroots-ochre)', fontSize: '1.6rem', marginBottom: '1rem', fontFamily: 'inherit' }}>
              Boots on the Ground in Mt Isa
            </h3>
            <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
              I'm Dave, the lead operator behind GrassRoots Mowing Co. Project #156 is a strategic, sponsor-funded program focused entirely on property restoration and hazard reduction. 
            </p>
            <p style={{ lineHeight: '1.6' }}>
              Equipped with specialized heavy clearing machinery and strict fire mitigation protocols, we handle the tough vegetation management jobs to keep our community safe.
            </p>
          </div>
        </section>

      </main>

      {/* Foreground Overlaps */}
      <img 
        src="/assets/grass-clippings-foreground.png" 
        className="artwork-grass-clippings" 
        alt="Tactile grass clippings" 
      />

    </div>
  );
}

export default App;