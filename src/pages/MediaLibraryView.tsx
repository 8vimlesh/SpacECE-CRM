import React, { useState } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { mediaService } from '../services/mediaService';
import type { MediaItem } from '../db/database';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Download,
  Search,
  Plus,
  X,
  Trash2,
  Copy,
  Check,
  Eye,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

type MediaTypeFilter = 'all' | 'image' | 'video' | 'audio' | 'document';

export const MediaLibraryView: React.FC = () => {
  const { data: mediaItems, refetch: refetchMedia } = useSupabaseData('media', () => mediaService.getAll());

  // UI Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>('all');

  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<MediaItem | null>(null);

  // Upload Form State
  const [dragActive, setDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Helper: Categorize Media Type
  const getMediaTypeCategory = (fileType: string): 'image' | 'video' | 'audio' | 'document' => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  // Helper: Format File Size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Filter Media List by Search Query & Type Filter
  const filteredMedia = (mediaItems || []).filter((item) => {
    const matchesSearch = item.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const category = getMediaTypeCategory(item.fileType);
    if (typeFilter !== 'all') {
      return category === typeFilter;
    }

    return true;
  });

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  // Process & Validate Upload File
  const processSelectedFile = (file: File) => {
    setUploadError(null);

    // 1. Size Validation (Max 50MB)
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`File size (${formatFileSize(file.size)}) exceeds allowed limit of 50 MB.`);
      return;
    }

    setUploadFile(file);
  };

  // Submit Upload to Supabase Storage
  const handleConfirmUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      await mediaService.uploadFile(uploadFile);
      refetchMedia();

      setIsUploading(false);
      setShowUploadModal(false);
      setUploadFile(null);
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(`Failed to process file: ${err.message || 'Storage error'}`);
    }
  };

  // Delete Asset
  const handleDeleteMedia = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this media asset?')) {
      await mediaService.delete(id);
      if (selectedPreviewItem?.id === id) {
        setSelectedPreviewItem(null);
      }
      refetchMedia();
    }
  };

  // Copy URL Handler
  const handleCopyUrl = (id: number, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="media-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Media Library</h1>
          <p className="page-subtitle">
            Centralized document & media asset manager for Spacece India Foundation circulars, photos, and videos
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
            <Plus size={16} />
            <span>+ Upload Media</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Controls Card */}
      <div className="card mb-6">
        <div className="media-filter-flex">
          {/* Search Field */}
          <div className="search-box-flex">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search assets by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter Pills */}
          <div className="type-filter-pills">
            <button
              className={`pill-btn ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              All Assets <span>({(mediaItems || []).length})</span>
            </button>

            <button
              className={`pill-btn ${typeFilter === 'image' ? 'active' : ''}`}
              onClick={() => setTypeFilter('image')}
            >
              <ImageIcon size={13} /> Images{' '}
              <span>({(mediaItems || []).filter((m) => getMediaTypeCategory(m.fileType) === 'image').length})</span>
            </button>

            <button
              className={`pill-btn ${typeFilter === 'video' ? 'active' : ''}`}
              onClick={() => setTypeFilter('video')}
            >
              <Video size={13} /> Videos{' '}
              <span>({(mediaItems || []).filter((m) => getMediaTypeCategory(m.fileType) === 'video').length})</span>
            </button>

            <button
              className={`pill-btn ${typeFilter === 'audio' ? 'active' : ''}`}
              onClick={() => setTypeFilter('audio')}
            >
              <Music size={13} /> Audio{' '}
              <span>({(mediaItems || []).filter((m) => getMediaTypeCategory(m.fileType) === 'audio').length})</span>
            </button>

            <button
              className={`pill-btn ${typeFilter === 'document' ? 'active' : ''}`}
              onClick={() => setTypeFilter('document')}
            >
              <FileText size={13} /> Documents{' '}
              <span>({(mediaItems || []).filter((m) => getMediaTypeCategory(m.fileType) === 'document').length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Media Cards Grid Container */}
      <div className="grid-3">
        {filteredMedia.length > 0 ? (
          filteredMedia.map((item) => {
            const category = getMediaTypeCategory(item.fileType);

            return (
              <div key={item.id} className="card media-card">
                {/* Media Thumbnail Box */}
                <div className="media-thumbnail-box" onClick={() => setSelectedPreviewItem(item)}>
                  {category === 'image' ? (
                    <img src={item.fileUrl} alt={item.fileName} className="media-thumb-img" />
                  ) : category === 'video' ? (
                    <div className="media-thumb-icon video">
                      <Video size={42} />
                      <span className="play-overlay-badge">VIDEO</span>
                    </div>
                  ) : category === 'audio' ? (
                    <div className="media-thumb-icon audio">
                      <Music size={42} />
                      <span className="play-overlay-badge">AUDIO</span>
                    </div>
                  ) : (
                    <div className="media-thumb-icon pdf">
                      <FileText size={42} />
                      <span className="play-overlay-badge">DOCUMENT</span>
                    </div>
                  )}

                  <span className="media-size-pill">{item.size}</span>
                </div>

                {/* Media Details */}
                <div className="media-details-box">
                  <h4 className="media-filename" title={item.fileName}>
                    {item.fileName}
                  </h4>
                  <div className="media-meta-rows">
                    <span className="media-type-tag">{item.fileType}</span>
                    <span className="media-date">{new Date(item.uploadDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Media Actions Row */}
                <div className="media-card-actions">
                  <button
                    className="btn btn-outline btn-sm flex-1"
                    onClick={() => setSelectedPreviewItem(item)}
                  >
                    <Eye size={14} /> Preview
                  </button>

                  <button
                    className="btn btn-outline btn-sm icon-only"
                    onClick={() => handleCopyUrl(item.id!, item.fileUrl)}
                    title="Copy File Link"
                  >
                    {copiedId === item.id ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  </button>

                  <button
                    className="btn btn-outline btn-sm danger icon-only"
                    onClick={() => handleDeleteMedia(item.id!)}
                    title="Delete Media Asset"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state" style={{ gridColumn: 'span 3' }}>
            <FileSpreadsheet size={44} />
            <p>
              {typeFilter !== 'all'
                ? `No files found matching category "${typeFilter}".`
                : searchQuery
                ? `No media assets matching "${searchQuery}".`
                : 'No media files uploaded yet.'}
            </p>
          </div>
        )}
      </div>

      {/* UPLOAD MEDIA MODAL (Drag & Drop + File Picker) */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>+ Upload Media & Document Asset</h3>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {uploadError && (
                <div className="alert alert-danger mb-4">
                  <AlertCircle size={18} />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                className={`dropzone-box ${dragActive ? 'active' : ''} ${uploadFile ? 'has-file' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload size={44} className="dropzone-icon" />
                <h4>Drag & Drop media file here</h4>
                <p className="dropzone-sub">or click below to choose a file from your device</p>

                <input
                  type="file"
                  id="media-file-input"
                  className="hidden-file-input"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xlsx,.txt"
                  onChange={handleFileInputChange}
                />

                <label htmlFor="media-file-input" className="btn btn-secondary btn-sm mt-3">
                  Browse Device Files
                </label>
              </div>

              {/* Selected File Details */}
              {uploadFile && (
                <div className="selected-file-card mt-4">
                  <div className="selected-file-info">
                    <FileText size={20} className="text-primary" />
                    <div>
                      <strong>{uploadFile.name}</strong>
                      <span className="text-xs text-muted block">
                        Size: {formatFileSize(uploadFile.size)} • Type: {uploadFile.type || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <button className="btn-icon danger" onClick={() => setUploadFile(null)}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmUpload}
                disabled={!uploadFile || isUploading}
              >
                {isUploading ? 'Uploading & Processing...' : 'Confirm & Save Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEDIA PREVIEW MODAL */}
      {selectedPreviewItem && (
        <div className="modal-overlay" onClick={() => setSelectedPreviewItem(null)}>
          <div className="modal-content preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedPreviewItem.fileName}</h3>
                <span className="text-xs text-muted">
                  {selectedPreviewItem.fileType} • {selectedPreviewItem.size}
                </span>
              </div>
              <button className="modal-close" onClick={() => setSelectedPreviewItem(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body preview-viewer-body">
              {getMediaTypeCategory(selectedPreviewItem.fileType) === 'image' ? (
                <img src={selectedPreviewItem.fileUrl} alt={selectedPreviewItem.fileName} className="preview-full-img" />
              ) : getMediaTypeCategory(selectedPreviewItem.fileType) === 'video' ? (
                <video controls src={selectedPreviewItem.fileUrl} className="preview-full-video" />
              ) : getMediaTypeCategory(selectedPreviewItem.fileType) === 'audio' ? (
                <div className="audio-player-box">
                  <Music size={48} className="text-primary mb-3" />
                  <audio controls src={selectedPreviewItem.fileUrl} className="w-full" />
                </div>
              ) : (
                <div className="doc-preview-box">
                  <FileText size={64} className="text-rose mb-3" />
                  <h4>{selectedPreviewItem.fileName}</h4>
                  <p className="text-xs text-muted mb-4">Document / PDF format available for download or browser view.</p>
                  <a
                    href={selectedPreviewItem.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    <Download size={16} /> Open Document in Browser
                  </a>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <a
                href={selectedPreviewItem.fileUrl}
                download={selectedPreviewItem.fileName}
                className="btn btn-outline mr-auto"
              >
                <Download size={16} /> Download File
              </a>
              <button className="btn btn-secondary" onClick={() => setSelectedPreviewItem(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master CSS for Media Library */}
      <style>{`
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-3 { margin-top: 0.75rem; }
        .mt-4 { margin-top: 1rem; }
        .text-xs { font-size: 0.75rem; }
        .block { display: block; }
        .mr-auto { margin-right: auto; }
        .flex-1 { flex: 1; }
        .w-full { width: 100%; }

        .media-filter-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .search-box-flex {
          position: relative;
          flex: 1;
          min-width: 280px;
        }

        .search-box-flex input {
          width: 100%;
          padding: 0.5rem 1rem 0.5rem 2.4rem;
          font-size: 0.84375rem;
          border: 1px solid var(--slate-300);
          border-radius: var(--radius-md);
          outline: none;
        }

        .search-box-flex .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--slate-400);
        }

        .type-filter-pills {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
        }

        .pill-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.875rem;
          font-size: 0.78125rem;
          font-weight: 700;
          border-radius: var(--radius-full);
          border: 1px solid var(--slate-200);
          background-color: var(--slate-100);
          color: var(--slate-700);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .pill-btn:hover {
          background-color: var(--slate-200);
        }

        .pill-btn.active {
          background-color: var(--navy-900);
          color: #ffffff;
          border-color: var(--navy-900);
        }

        .media-card {
          display: flex;
          flex-direction: column;
        }

        .media-thumbnail-box {
          height: 150px;
          background-color: var(--slate-100);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin-bottom: 0.875rem;
          overflow: hidden;
          cursor: pointer;
        }

        .media-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .media-thumb-icon {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .media-thumb-icon.video { color: #9333ea; }
        .media-thumb-icon.audio { color: #0d9488; }
        .media-thumb-icon.pdf { color: #e11d48; }

        .play-overlay-badge {
          font-size: 0.6875rem;
          font-weight: 800;
          background-color: rgba(15, 23, 42, 0.75);
          color: #ffffff;
          padding: 0.1rem 0.45rem;
          border-radius: var(--radius-sm);
        }

        .media-size-pill {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background-color: rgba(15, 23, 42, 0.8);
          color: #ffffff;
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 0.1rem 0.45rem;
          border-radius: var(--radius-sm);
        }

        .media-filename {
          font-size: 0.875rem;
          font-weight: 800;
          color: var(--navy-900);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 0.2rem;
        }

        .media-meta-rows {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--slate-500);
          margin-bottom: 0.875rem;
        }

        .media-card-actions {
          display: flex;
          gap: 0.4rem;
          margin-top: auto;
        }

        .upload-modal {
          max-width: 550px;
        }

        .dropzone-box {
          border: 2px dashed var(--slate-300);
          border-radius: var(--radius-lg);
          padding: 2.5rem 1.5rem;
          text-align: center;
          background-color: var(--slate-50);
          transition: all 0.2s ease;
        }

        .dropzone-box.active {
          border-color: var(--primary-600);
          background-color: #f0fdfa;
        }

        .dropzone-icon {
          color: var(--slate-400);
          margin-bottom: 0.75rem;
        }

        .dropzone-sub {
          font-size: 0.75rem;
          color: var(--slate-500);
        }

        .hidden-file-input {
          display: none;
        }

        .selected-file-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem;
          background-color: #f0fdfa;
          border: 1px solid var(--primary-100);
          border-radius: var(--radius-md);
        }

        .selected-file-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .preview-modal {
          max-width: 800px;
        }

        .preview-viewer-body {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--slate-900);
          min-height: 340px;
          border-radius: var(--radius-md);
          overflow: hidden;
          padding: 1.5rem;
        }

        .preview-full-img {
          max-width: 100%;
          max-height: 450px;
          object-fit: contain;
        }

        .preview-full-video {
          width: 100%;
          max-height: 450px;
        }

        .audio-player-box {
          text-align: center;
          width: 100%;
          max-width: 400px;
        }

        .doc-preview-box {
          text-align: center;
          color: #ffffff;
        }
      `}</style>
    </div>
  );
};
