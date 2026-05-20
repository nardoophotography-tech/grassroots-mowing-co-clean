import * as React from 'react';
import { Button } from './ui/Button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface InvoiceDownloadButtonProps {
  invoiceId: string;
  existingPdfUrl?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const InvoiceDownloadButton: React.FC<InvoiceDownloadButtonProps> = ({ 
  invoiceId, 
  existingPdfUrl,
  className,
  variant = "outline",
  size = "sm"
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleDownload = async () => {
    if (existingPdfUrl) {
      window.open(existingPdfUrl, '_blank');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/generate-invoice-pdf/${invoiceId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF invoice');
      }

      const { url } = await response.json();
      if (url) {
        window.open(url, '_blank');
        toast.success('Invoice generated successfully');
      } else {
        throw new Error('No URL returned from server');
      }
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      toast.error(error.message || 'Error generating invoice PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      disabled={isGenerating}
      onClick={handleDownload}
      className={cn("gap-2", className)}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      {isGenerating ? 'Generating...' : 'Download PDF'}
    </Button>
  );
};
