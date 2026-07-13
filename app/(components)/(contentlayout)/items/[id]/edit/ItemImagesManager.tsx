'use client';

import { useEffect, useState, useRef } from 'react';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';
import { useDialog } from '@/shared/context/DialogContext';

const API = process.env.NEXT_PUBLIC_API_URL;
// API serves images from the same host but without the /api prefix.
const IMAGE_BASE = (API ?? '').replace(/\/api\/?$/, '');

type Img = {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
  altText?: string | null;
};

/**
 * Manages item images: list / upload / mark-primary / delete.
 * Uses the 4 admin endpoints under /api/items/{id}/images.
 * Self-contained — no Redux; uses fetch with the existing auth header helper.
 */
export default function ItemImagesManager({ itemId }: { itemId: string }) {
  const { confirm } = useDialog();
  const [images, setImages] = useState<Img[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const absoluteUrl = (u: string) =>
    u.startsWith('http') ? u : `${IMAGE_BASE}${u.startsWith('/') ? u : '/' + u}`;

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/items/${itemId}/images`, { headers: getAuthHeaders() });
      const d = await r.json();
      setImages(d?.data || d || []);
    } catch {
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (itemId) load(); }, [itemId]);

  const upload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be 10 MB or smaller');
      return;
    }
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      toast.error('Allowed formats: JPG, PNG, WebP');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const r = await fetch(`${API}/items/${itemId}/images`, {
        method: 'POST',
        headers: getAuthHeaders(),  // do NOT set Content-Type; browser sets multipart boundary
        body: form,
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) {
        toast.error(d?.message || 'Upload failed');
      } else {
        toast.success('Image uploaded');
        load();
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const setPrimary = async (imageId: string) => {
    setActing(imageId);
    try {
      const r = await fetch(`${API}/items/${itemId}/images/${imageId}/set-primary`, {
        method: 'PUT', headers: getAuthHeaders(),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) {
        toast.error(d?.message || 'Could not set primary');
      } else {
        toast.success('Primary image updated');
        load();
      }
    } finally { setActing(null); }
  };

  const remove = async (imageId: string) => {
    if (!await confirm('This image will be permanently deleted and cannot be recovered.', { title: 'Delete Image', variant: 'danger', confirmLabel: 'Delete' })) return;
    setActing(imageId);
    try {
      const r = await fetch(`${API}/items/${itemId}/images/${imageId}`, {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) {
        toast.error(d?.message || 'Delete failed');
      } else {
        toast.success('Image deleted');
        load();
      }
    } finally { setActing(null); }
  };

  return (
    <div className="box">
      <div className="box-header flex items-center justify-between">
        <h4 className="box-title mb-0">
          Item Images
          <span className="ms-2 text-sm text-gray-500 font-normal">
            ({images.length} {images.length === 1 ? 'image' : 'images'})
          </span>
        </h4>

        <label className={`ti-btn ti-btn-primary-full !text-white !opacity-100 cursor-pointer ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
          {uploading ? (
            <><i className="ri-loader-4-line animate-spin me-1"></i>Uploading...</>
          ) : (
            <><i className="ri-upload-2-line me-1"></i>Upload Image</>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
            disabled={uploading}
          />
        </label>
      </div>

      <div className="box-body">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
            <p className="mt-3 text-sm text-gray-500">Loading images...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <i className="ri-image-line text-5xl text-gray-400 block mb-2"></i>
            <p className="text-gray-500 mb-1">No images uploaded yet</p>
            <p className="text-xs text-gray-400">
              The first image you upload becomes the primary image (shown in the mobile app).
              <br />JPG, PNG, or WebP — up to 10 MB.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                  img.isPrimary ? 'border-primary shadow-lg' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={absoluteUrl(img.imageUrl)}
                    alt={img.altText || 'Item image'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {img.isPrimary && (
                    <span className="absolute top-2 left-2 badge bg-primary text-white text-xs px-2 py-1 rounded font-semibold">
                      <i className="ri-star-fill me-1"></i>Primary
                    </span>
                  )}
                </div>

                <div className="p-2 bg-white flex items-center justify-between gap-1">
                  {!img.isPrimary ? (
                    <button
                      onClick={() => setPrimary(img.id)}
                      disabled={acting === img.id}
                      title="Set as primary"
                      className="flex-1 text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
                    >
                      <i className="ri-star-line me-1"></i>Make primary
                    </button>
                  ) : (
                    <span className="flex-1 text-xs px-2 py-1 text-gray-400 text-center">
                      Mobile sees this one
                    </span>
                  )}
                  <button
                    onClick={() => remove(img.id)}
                    disabled={acting === img.id}
                    title="Delete image"
                    className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  >
                    {acting === img.id
                      ? <i className="ri-loader-4-line animate-spin"></i>
                      : <i className="ri-delete-bin-line"></i>
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <p className="text-xs text-gray-400 mt-4">
            <i className="ri-information-line me-1"></i>
            The primary image is what appears in the mobile app's product carousel as the first slide.
          </p>
        )}
      </div>
    </div>
  );
}
