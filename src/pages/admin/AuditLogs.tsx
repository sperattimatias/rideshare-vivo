import { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, FileText, ArrowLeft } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { getRecentAuditLogs } from '../../lib/adminOperations';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  metadata?: any;
  created_at: string;
  admin: {
    user: {
      full_name: string;
    };
  };
}

interface AuditLogsProps {
  onBack: () => void;
}

export default function AuditLogs({ onBack }: AuditLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, entityFilter]);

  async function loadAuditLogs() {
    try {
      const data = await getRecentAuditLogs(100);
      setLogs(data);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterLogs() {
    let filtered = logs;

    if (entityFilter !== 'all') {
      filtered = filtered.filter((log) => log.entity_type === entityFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.admin.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-blue-600 bg-blue-50';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'text-red-600 bg-red-50';
    if (action.includes('APPROVE')) return 'text-green-600 bg-green-50';
    if (action.includes('REJECT') || action.includes('SUSPEND'))
      return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const entityTypes = Array.from(new Set(logs.map((log) => log.entity_type)));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Panel
        </Button>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Logs</h1>
          <p className="text-gray-600">
            Complete audit trail of all administrative actions
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Filters and List */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4">
              <div className="space-y-4">
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="w-5 h-5" />}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entity Type
                  </label>
                  <select
                    value={entityFilter}
                    onChange={(e) => setEntityFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Types</option>
                    {entityTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export Logs
                </Button>
              </div>
            </Card>

            {loading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading logs...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                {filteredLogs.map((log) => (
                  <Card
                    key={log.id}
                    className={`p-3 cursor-pointer transition-all ${
                      selectedLog?.id === log.id
                        ? 'border-2 border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {log.admin.user.full_name}
                    </p>
                    <p className="text-xs text-gray-600">{log.entity_type}</p>
                  </Card>
                ))}

                {filteredLogs.length === 0 && (
                  <Card className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No logs found</p>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Log Details */}
          <div className="lg:col-span-2">
            {selectedLog ? (
              <div className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedLog.action}
                      </h2>
                      <div className="flex gap-2 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor(
                            selectedLog.action
                          )}`}
                        >
                          {selectedLog.action}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                          {selectedLog.entity_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Performed By</p>
                      <p className="font-medium text-gray-900">
                        {selectedLog.admin.user.full_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Timestamp</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedLog.created_at).toLocaleString()}
                      </p>
                    </div>
                    {selectedLog.entity_id && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 mb-1">Entity ID</p>
                        <p className="font-mono text-sm text-gray-900">
                          {selectedLog.entity_id}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedLog.old_values && (
                    <div className="border-t pt-4 mb-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Previous Values</h3>
                      <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-xs text-gray-700">
                          {JSON.stringify(selectedLog.old_values, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {selectedLog.new_values && (
                    <div className="border-t pt-4 mb-4">
                      <h3 className="font-semibold text-gray-900 mb-3">New Values</h3>
                      <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-xs text-gray-700">
                          {JSON.stringify(selectedLog.new_values, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Metadata</h3>
                      <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-xs text-gray-700">
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </Card>

                <Card className="p-4 bg-blue-50 border-2 border-blue-200">
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Audit Information</h3>
                      <p className="text-sm text-blue-800">
                        This action was logged for compliance and security purposes. All audit
                        logs are immutable and cannot be modified or deleted.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a log entry to view details</p>
              </Card>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="p-4">
            <p className="text-sm text-gray-600 mb-1">Total Logs</p>
            <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600 mb-1">Filtered Results</p>
            <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600 mb-1">Entity Types</p>
            <p className="text-2xl font-bold text-gray-900">{entityTypes.length}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
