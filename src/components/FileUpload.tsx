import { Upload, X, FileText } from 'lucide-react';
import { useState } from 'react';

interface FileUploadProps {
  label: string;
  accept?: string;
  value?: string;
  onChange: (file: File | null, preview?: string) => void;
  required?: boolean;
  helperText?: string;
}

export function FileUpload({
  label,
  accept = 'image/*',
  value,
  onChange,
  required = false,
  helperText
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(value);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        onChange(file, result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(undefined);
      onChange(file);
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    setFileName('');
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-w-xs h-48 object-cover rounded-lg border-2 border-gray-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : fileName ? (
        <div className="flex items-center gap-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
          <FileText className="w-6 h-6 text-gray-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{fileName}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-red-500 hover:text-red-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click para subir</span> o arrastrá aquí
            </p>
            <p className="text-xs text-gray-400">PNG, JPG, PDF (máx. 10MB)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
            required={required && !preview && !fileName}
          />
        </label>
      )}

      {helperText && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
