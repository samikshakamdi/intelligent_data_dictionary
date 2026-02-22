const { useState, useEffect } = React;

// Auto-detect if we're running locally from file/localhost or deployed
const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocal ? "http://127.0.0.1:8000/api" : "/api";
function App() {
    const [activeTab, setActiveTab] = useState('schema');
    const [isUploading, setIsUploading] = useState(false);
    const [tables, setTables] = useState([]);
    const [activeTable, setActiveTable] = useState(null);
    const [uploadError, setUploadError] = useState('');

    // DB Connect State
    const [dbUrl, setDbUrl] = useState('');
    const [dbConnectLoading, setDbConnectLoading] = useState(false);
    const [dbConnectError, setDbConnectError] = useState('');
    const [dbConnectSuccess, setDbConnectSuccess] = useState('');

    const fetchTables = async (currentActive = null, forceAutoSelect = false) => {
        try {
            const res = await fetch(`${API_URL}/tables`);
            const data = await res.json();
            if (res.ok && data.tables) {
                setTables(data.tables);
                // Set active table if none is set, or if we want to force one
                if (currentActive && data.tables.includes(currentActive)) {
                    setActiveTable(currentActive);
                } else if (!activeTable || forceAutoSelect) {
                    // Auto-select the first table if none is active OR if forceAutoSelect is true
                    setActiveTable(data.tables.length > 0 ? data.tables[0] : null);
                } else if (activeTable && !data.tables.includes(activeTable)) {
                    // Active table was deleted
                    setActiveTable(data.tables.length > 0 ? data.tables[0] : null);
                }
            }
        } catch (e) {
            console.error("Failed to fetch tables", e);
        }
    };

    useEffect(() => {
        // Reset the backend database on page load to ensure a fresh start
        // Wait for it to finish, then fetch tables (which should now be empty)
        const init = async () => {
            try {
                await fetch(`${API_URL}/reset`, { method: 'DELETE' });
                setTables([]);
                setActiveTable(null);
            } catch (err) {
                console.error("Failed to reset database", err);
            }
        };
        init();
    }, []);

    const handleUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadError('');

        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('files', file);
        });

        try {
            const res = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                e.target.value = ''; // Clear file input value
                let newActive = activeTable;
                if (data.results && data.results.length > 0) {
                    newActive = data.results[0].name;
                }
                await fetchTables(newActive);
            } else {
                setUploadError(data.error || 'Upload failed');
            }
        } catch (err) {
            setUploadError('Failed to connect to server');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteTable = async (tableNameToDelete, e) => {
        e.stopPropagation();
        try {
            const res = await fetch(`${API_URL}/tables/${tableNameToDelete}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchTables();
            }
        } catch (err) {
            console.error("Failed to delete table", err);
        }
    };

    const handleConnectDatabase = async (e) => {
        e.preventDefault();
        if (!dbUrl) return;

        setDbConnectLoading(true);
        setDbConnectError('');
        setDbConnectSuccess('');

        try {
            const res = await fetch(`${API_URL}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: dbUrl })
            });
            const data = await res.json();

            if (res.ok && !data.error) {
                setDbConnectSuccess(data.message || 'Connected successfully!');
                setDbUrl('');
                // Fetch the new tables from the newly connected DB and force auto-select
                fetchTables(null, true);
            } else {
                setDbConnectError(data.error || 'Failed to connect');
            }
        } catch (err) {
            setDbConnectError('Server connection failed');
        } finally {
            setDbConnectLoading(false);
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
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Upload Dataset</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Upload a CSV file to begin analysis</p>

                    <input
                        type="file"
                        id="fileInput"
                        className="file-input"
                        accept=".csv"
                        multiple
                        onChange={handleUpload}
                        disabled={isUploading}
                    />
                    <button
                        className="upload-btn"
                        onClick={() => document.getElementById('fileInput').click()}
                        disabled={isUploading}
                    >
                        {isUploading ? 'Uploading...' : 'Upload CSV(s)'}
                    </button>

                    {tables.length > 0 && (
                        <div style={{ marginTop: '2rem' }}>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Uploaded Tables</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {tables.map(t => (
                                    <div
                                        key={t}
                                        onClick={() => setActiveTable(t)}
                                        style={{
                                            padding: '0.75rem',
                                            background: activeTable === t ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                            color: activeTable === t ? '#000000' : 'var(--text-main)',
                                            borderLeft: activeTable === t ? '3px solid rgba(0,0,0,0.5)' : '3px solid transparent',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '0.875rem',
                                            transition: 'all 0.2s',
                                            fontWeight: activeTable === t ? '600' : '400'
                                        }}
                                    >
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t}</span>
                                        <button
                                            onClick={(e) => handleDeleteTable(t, e)}
                                            style={{ background: 'none', border: 'none', color: activeTable === t ? 'rgba(0,0,0,0.6)' : 'rgba(255, 255, 255, 0.5)', cursor: 'pointer', padding: '0.2rem', fontSize: '1rem' }}
                                            title="Delete Table"
                                        >
                                            ✖
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* External SQL Connect Section */}
                <div className="upload-section" style={{ marginTop: '1rem', padding: '1rem' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔌</div>
                    <div style={{ color: 'var(--text-main)', fontWeight: 500, marginBottom: '0.25rem' }}>Connect via SQL</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        PostgreSQL, MySQL, external SQLite, etc.
                    </div>
                    <form onSubmit={handleConnectDatabase} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="database_url://..."
                            value={dbUrl}
                            onChange={(e) => setDbUrl(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.875rem' }}
                        />
                        <button type="submit" className="upload-btn" disabled={dbConnectLoading || !dbUrl} style={{ padding: '0.5rem', fontSize: '0.875rem', marginTop: 0 }}>
                            {dbConnectLoading ? 'Connecting...' : 'Connect'}
                        </button>
                    </form>
                    {dbConnectError && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{dbConnectError}</div>}
                    {dbConnectSuccess && <div style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{dbConnectSuccess}</div>}
                </div>


                {uploadError && (
                    <div style={{ marginTop: '1rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
                        ❌ {uploadError}
                    </div>
                )}

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
                    <button className={`tab ${activeTab === 'relationships' ? 'active' : ''}`} onClick={() => setActiveTab('relationships')}>
                        🔗 Relationships
                    </button>
                    <button className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')} style={{ marginLeft: 'auto', background: activeTab === 'chat' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: activeTab === 'chat' ? '#000' : 'inherit', fontWeight: activeTab === 'chat' ? '600' : 'normal' }}>
                        💬 Ask AI
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'schema' && <SchemaTab />}
                    {activeTab === 'quality' && <QualityTab key={activeTable} tableName={activeTable} />}
                    {activeTab === 'health' && <HealthTab />}
                    {activeTab === 'industry' && <IndustryTab />}
                    {activeTab === 'relationships' && <RelationshipsTab key={activeTable} tableName={activeTable} tablesCount={tables.length} />}
                    {activeTab === 'chat' && <ChatTab />}
                </div>
            </div>
        </div >
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
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
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

function RelationshipsTab({ tableName, tablesCount }) {
    const [subTab, setSubTab] = useState('single');
    const [relationships, setRelationships] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [crossRelationships, setCrossRelationships] = useState(null);
    const [crossLoading, setCrossLoading] = useState(false);

    const fetchRelationships = async () => {
        if (!tableName) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/relationships/${tableName}`);
            const data = await res.json();
            if (res.ok && !data.error) setRelationships(data);
            else setError(data.error || "Failed to calculate relationships");
        } catch (e) {
            setError("Server connection failed");
        } finally {
            setLoading(false);
        }
    };

    const fetchCrossRelationships = async () => {
        setCrossLoading(true);
        try {
            const res = await fetch(`${API_URL}/cross-relationships`);
            const data = await res.json();
            if (res.ok && !data.error) setCrossRelationships(data);
        } catch (e) {
            console.error("Server connection failed");
        } finally {
            setCrossLoading(false);
        }
    };

    // Helper to get color based on correlation value (-1 to 1)
    const getCorrelationColor = (value) => {
        if (value === null || value === undefined || isNaN(value)) return 'var(--card-bg)';
        // Monochromatic scale:
        // Positive: White with varying opacity
        // Negative: Black/Dark with varying opacity
        if (value >= 0) {
            const alpha = Math.max(0.1, value * 0.8);
            return `rgba(255, 255, 255, ${alpha})`;
        } else {
            const alpha = Math.max(0.3, Math.abs(value));
            return `rgba(0, 0, 0, ${alpha})`;
        }
    };

    return (
        <div className="card">
            {tablesCount > 1 && (
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                    <button
                        onClick={() => setSubTab('single')}
                        style={{ background: subTab === 'single' ? 'var(--accent)' : 'transparent', color: subTab === 'single' ? '#000' : 'inherit', border: '1px solid var(--accent)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: subTab === 'single' ? '600' : 'normal' }}
                    >
                        Single Table Correlation
                    </button>
                    <button
                        onClick={() => { setSubTab('cross'); if (!crossRelationships) fetchCrossRelationships(); }}
                        style={{ background: subTab === 'cross' ? 'var(--accent)' : 'transparent', color: subTab === 'cross' ? '#000' : 'inherit', border: '1px solid var(--accent)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: subTab === 'cross' ? '600' : 'normal' }}
                    >
                        Cross-Table Links
                    </button>
                </div>
            )}

            {subTab === 'single' && (
                <div>
                    {!tableName ? (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                            <h2 style={{ marginBottom: '1rem' }}>No Dataset Active</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Please upload a dataset from the sidebar first.</p>
                        </div>
                    ) : !relationships && !loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
                            <h2 style={{ marginBottom: '1rem' }}>Analyze Column Relationships</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Compute a correlation matrix for numeric columns in <strong>{tableName}</strong></p>
                            <button className="upload-btn" style={{ width: 'auto' }} onClick={fetchRelationships}>Analyze Relationships</button>
                        </div>
                    ) : loading ? (
                        <div className="loading-spinner"><div className="spinner"></div>Analyzing relationships...</div>
                    ) : error ? (
                        <div style={{ color: 'var(--danger)' }}>{error}</div>
                    ) : (
                        <div>
                            <h2 style={{ marginBottom: '1rem' }}>Relationship/Correlation Matrix</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                                Values range from <strong>-1.0</strong> (strong negative relation) to <strong>1.0</strong> (strong positive relation). 0 means no linear relationship. Only numeric columns are compared.
                            </p>

                            <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                                                Columns
                                            </th>
                                            {relationships.columns.map(col => (
                                                <th key={col} style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, fontSize: '0.875rem', minWidth: '100px' }}>
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {relationships.matrix.map((row) => (
                                            <tr key={row.column}>
                                                <td style={{ padding: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600, fontSize: '0.875rem', textAlign: 'left', background: 'rgba(0,0,0,0.1)' }}>
                                                    {row.column}
                                                </td>
                                                {relationships.columns.map(col => {
                                                    const val = row[col];
                                                    const cellColor = val === 1.0 ? 'transparent' : getCorrelationColor(val);
                                                    return (
                                                        <td key={col} style={{
                                                            padding: '1rem',
                                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                            background: cellColor,
                                                            color: val !== null && Math.abs(val) > 0.5 ? '#fff' : 'inherit',
                                                            fontWeight: val !== null && Math.abs(val) > 0.7 ? 'bold' : 'normal'
                                                        }}>
                                                            {val !== null ? val.toFixed(2) : '-'}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '12px', height: '12px', background: 'rgba(255, 255, 255, 0.8)', borderRadius: '2px' }}></div>
                                    Positive Correlation
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '12px', height: '12px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px' }}></div>
                                    Neutral
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '12px', height: '12px', background: 'rgba(0, 0, 0, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px' }}></div>
                                    Negative Correlation
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {subTab === 'cross' && (
                <div>
                    <h2 style={{ marginBottom: '1rem' }}>Cross-Table Links</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                        This shows potential relationships (e.g. Foreign Keys) between different tables based on common column names.
                    </p>

                    {crossLoading ? (
                        <div className="loading-spinner"><div className="spinner"></div>Finding relationships between {tablesCount} tables...</div>
                    ) : crossRelationships && crossRelationships.links && crossRelationships.links.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {crossRelationships.links.map((link, idx) => (
                                <div key={idx} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', fontSize: '1.1rem' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{link.source}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>⟷</span>
                                        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{link.target}</span>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Common Columns:</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {link.common_columns.map(col => (
                                                <span key={col} className="badge badge-blue">{col}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : crossRelationships ? (
                        <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤷‍♂️</div>
                            <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>No common columns found between any of the uploaded tables.</div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

function ChatTab() {
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hello! I am your Database AI. Ask me anything about your schema, data quality, or request SQL queries!' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = React.useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg })
            });
            const data = await res.json();

            if (res.ok && !data.error) {
                setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: 'ai', text: `Error: ${data.error || 'Failed to get response'}` }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Network Error: Failed to reach the AI server.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card chat-container" style={{ display: 'flex', flexDirection: 'column', height: '600px', padding: '0' }}>
            <div className="card-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h3 className="card-title" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🤖 Database Assistant AI
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    Powered by Google Gemini. Automatically scans your live schema to write accurate SQL.
                </p>
            </div>

            <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`} style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        background: msg.role === 'user' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                        color: msg.role === 'user' ? '#000000' : 'var(--text-main)',
                        padding: '1rem',
                        borderRadius: '8px',
                        borderBottomRightRadius: msg.role === 'user' ? '0' : '8px',
                        borderBottomLeftRadius: msg.role === 'ai' ? '0' : '8px',
                        lineHeight: '1.5',
                        fontSize: '0.9rem',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {msg.text}
                    </div>
                ))}
                {isLoading && (
                    <div className="chat-message ai" style={{
                        alignSelf: 'flex-start',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '1rem',
                        borderRadius: '8px',
                        borderBottomLeftRadius: '0',
                        color: 'var(--text-muted)'
                    }}>
                        Thinking...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g. Write a SQL query to find the department with the most employees..."
                        style={{
                            flex: 1,
                            padding: '1rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'rgba(255,255,255,0.02)',
                            color: 'white',
                            fontSize: '0.9rem'
                        }}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        style={{
                            padding: '0 1.5rem',
                            background: 'var(--accent)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
                            opacity: (isLoading || !input.trim()) ? 0.5 : 1
                        }}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
