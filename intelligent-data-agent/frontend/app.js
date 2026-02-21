const { useState, useEffect } = React;

const API_URL = "http://127.0.0.1:8080/api";

function App() {
    const [activeTab, setActiveTab] = useState('schema');
    const [isUploading, setIsUploading] = useState(false);
    const [tableName, setTableName] = useState(null);
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
        // Reset the backend database on page load to ensure a fresh start
        fetch(`${API_URL}/reset`, { method: 'DELETE' }).catch(console.error);
    }, []);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                setTableName(file.name.split('.')[0]);
                e.target.value = ''; // Clear file input value to prevent cached uploads
            } else {
                setUploadError(data.error || 'Upload failed');
            }
        } catch (err) {
            setUploadError('Failed to connect to server');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="app-container">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="logo">
                    <span>🤖</span> Intelligent Data Agent
                </div>

                <div className="upload-section">
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>1. Upload Dataset</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Upload a CSV file to begin analysis</p>

                    <input
                        type="file"
                        id="fileInput"
                        className="file-input"
                        accept=".csv"
                        onChange={handleUpload}
                        disabled={isUploading}
                    />
                    <button
                        className="upload-btn"
                        onClick={() => document.getElementById('fileInput').click()}
                        disabled={isUploading}
                    >
                        {isUploading ? 'Uploading...' : 'Choose CSV File'}
                    </button>

                    {tableName && (
                        <div style={{ marginTop: '1rem', color: 'var(--success)', fontSize: '0.875rem' }}>
                            ✅ Currently analyzing: <strong>{tableName}</strong>
                        </div>
                    )}
                    {uploadError && (
                        <div style={{ marginTop: '1rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
                            ❌ {uploadError}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Built with React + FastAPI + SQLite
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content">
                <h1 className="header-title">Data Intelligence Hub</h1>
                <p className="header-subtitle">Analyze, profile, and understand your database schema with AI</p>

                {/* Navigation Tabs */}
                <div className="tabs-container">
                    <button className={`tab ${activeTab === 'schema' ? 'active' : ''}`} onClick={() => setActiveTab('schema')}>
                        📊 Schema Extraction
                    </button>
                    <button className={`tab ${activeTab === 'quality' ? 'active' : ''}`} onClick={() => setActiveTab('quality')}>
                        ✅ Data Quality
                    </button>
                    <button className={`tab ${activeTab === 'health' ? 'active' : ''}`} onClick={() => setActiveTab('health')}>
                        🏥 DB Health
                    </button>
                    <button className={`tab ${activeTab === 'industry' ? 'active' : ''}`} onClick={() => setActiveTab('industry')}>
                        🏢 Industry Detection
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'schema' && <SchemaTab />}
                    {activeTab === 'quality' && <QualityTab tableName={tableName} />}
                    {activeTab === 'health' && <HealthTab />}
                    {activeTab === 'industry' && <IndustryTab />}
                </div>
            </div>
        </div>
    );
}

// Subcomponents
function SchemaTab() {
    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchSchema = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/schema`);
            if (res.ok) setSchema(await res.json());
            else setError("Failed to fetch schema");
        } catch (e) {
            setError("Server connection failed");
        } finally {
            setLoading(false);
        }
    };

    if (!schema && !loading) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗄️</div>
                <h2 style={{ marginBottom: '1rem' }}>Extract Database Schema</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Click below to pull the latest tables and relationships</p>
                <button className="upload-btn" style={{ width: 'auto' }} onClick={fetchSchema}>Extract Schema</button>
            </div>
        );
    }

    if (loading) return <div className="loading-spinner"><div className="spinner"></div>Loading schema...</div>;
    if (error) return <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>;

    return (
        <div className="card">
            <h2 style={{ marginBottom: '2rem' }}>Database Schema</h2>
            {Object.entries(schema).map(([tableName, data]) => (
                <div key={tableName} style={{ marginBottom: '3rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge badge-blue">Table</span> {tableName}
                    </h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Column Name</th>
                                    <th>Data Type</th>
                                    <th>Nullable</th>
                                    <th>Primary Key</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.columns.map((col, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 500 }}>{col.name}</td>
                                        <td><span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{col.type}</span></td>
                                        <td>{col.nullable ? 'Yes' : 'No'}</td>
                                        <td>{col.primary_key ? '🔑' : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}

function QualityTab({ tableName }) {
    const [quality, setQuality] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchQuality = async () => {
        if (!tableName) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/quality/${tableName}`);
            const data = await res.json();
            if (res.ok && !data.error) setQuality(data);
            else setError(data.error || "Failed to analyze quality");
        } catch (e) {
            setError("Server connection failed");
        } finally {
            setLoading(false);
        }
    };

    if (!tableName) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                <h2 style={{ marginBottom: '1rem' }}>No Dataset Active</h2>
                <p style={{ color: 'var(--text-muted)' }}>Please upload a dataset from the sidebar first.</p>
            </div>
        );
    }

    if (!quality && !loading) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
                <h2 style={{ marginBottom: '1rem' }}>Analyze Data Quality</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Analyze completeness and uniqueness for <strong>{tableName}</strong></p>
                <button className="upload-btn" style={{ width: 'auto' }} onClick={fetchQuality}>Check Quality</button>
            </div>
        );
    }

    if (loading) return <div className="loading-spinner"><div className="spinner"></div>Analyzing quality...</div>;
    if (error) return <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>;

    return (
        <div className="card">
            <h2 style={{ marginBottom: '2rem' }}>Quality Report: <span style={{ color: 'var(--accent)' }}>{quality.table_name}</span></h2>

            <div className="grid-2">
                <div className="metric-card">
                    <div className="metric-title">Overall Score</div>
                    <div className="metric-value" style={{ color: quality.overall_quality_score > 80 ? 'var(--success)' : 'var(--warning)' }}>
                        {quality.overall_quality_score}%
                    </div>
                </div>
                <div className="metric-card">
                    <div className="grid-2" style={{ marginBottom: 0, gap: '1rem' }}>
                        <div>
                            <div className="metric-title">Rows</div>
                            <div className="metric-value" style={{ fontSize: '1.5rem' }}>{quality.total_rows}</div>
                        </div>
                        <div>
                            <div className="metric-title">Columns</div>
                            <div className="metric-value" style={{ fontSize: '1.5rem' }}>{quality.total_columns}</div>
                        </div>
                    </div>
                </div>
            </div>

            <h3 style={{ marginBottom: '1rem', marginTop: '2rem' }}>Column Level Details</h3>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Column</th>
                            <th>Data Type</th>
                            <th>Missing Values</th>
                            <th>Missing %</th>
                            <th>Unique Values</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quality.columns.map((col, idx) => (
                            <tr key={idx}>
                                <td style={{ fontWeight: 500 }}>{col.column}</td>
                                <td>{col.dtype}</td>
                                <td>{col.missing_count}</td>
                                <td>
                                    <span className={col.missing_percentage > 0 ? 'badge badge-red' : 'badge badge-green'}>
                                        {col.missing_percentage}%
                                    </span>
                                </td>
                                <td>{col.unique_values}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function HealthTab() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/health`);
            if (res.ok) setHealth(await res.json());
        } finally {
            setLoading(false);
        }
    };

    if (!health && !loading) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <button className="upload-btn" style={{ width: 'auto' }} onClick={fetchHealth}>Calculate Database Health</button>
            </div>
        );
    }

    if (loading) return <div className="loading-spinner"><div className="spinner"></div>Calculating score...</div>;

    const getStatusColor = (status) => {
        if (status === 'Excellent' || status === 'Good') return 'var(--success)';
        if (status === 'Needs Improvement') return 'var(--warning)';
        return 'var(--danger)';
    };

    return (
        <div className="card">
            <h2 style={{ marginBottom: '2rem' }}>Database Health Score</h2>
            <div className="grid-2">
                <div className="metric-card" style={{ textAlign: 'center' }}>
                    <div className="metric-title">Overall Health Score</div>
                    <div className="metric-value" style={{ fontSize: '3rem', color: getStatusColor(health.status) }}>
                        {health.overall_health_score}/100
                    </div>
                </div>
                <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="metric-title">Status</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: getStatusColor(health.status) }}>
                        {health.status}
                    </div>
                    <div style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
                        Evaluated {health.total_tables} tables.
                    </div>
                </div>
            </div>
        </div>
    );
}

function IndustryTab() {
    const [industry, setIndustry] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchIndustry = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/industry`);
            if (res.ok) setIndustry(await res.json());
        } finally {
            setLoading(false);
        }
    };

    if (!industry && !loading) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <button className="upload-btn" style={{ width: 'auto' }} onClick={fetchIndustry}>Detect Industry from Schema</button>
            </div>
        );
    }

    if (loading) return <div className="loading-spinner"><div className="spinner"></div>Running AI Detection...</div>;

    return (
        <div className="card">
            <h2 style={{ marginBottom: '2rem' }}>Industry Detection Engine</h2>
            <div className="grid-2">
                <div className="metric-card">
                    <div className="metric-title">Predicted Industry</div>
                    <div className="metric-value" style={{ color: 'var(--accent)' }}>{industry.industry}</div>
                </div>
                <div className="metric-card">
                    <div className="metric-title">Confidence Level</div>
                    <div className="metric-value">{industry.confidence}</div>
                </div>
            </div>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Keyword Matching Scores</h3>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace' }}>
                {Object.entries(industry.all_scores || {}).map(([ind, score]) => (
                    <div key={ind} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span>{ind}:</span>
                        <span style={{ color: score > 0 ? 'var(--success)' : 'inherit' }}>{score} matches</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
