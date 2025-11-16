import { Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ExportMenuProps {
  eventId?: string;
  meetId?: string;
  type: "event" | "meet";
  className?: string;
}

export function ExportMenu({ eventId, meetId, type, className }: ExportMenuProps) {
  const { toast } = useToast();
  
  // Guard: Don't render if no valid ID
  const id = type === "event" ? eventId : meetId;
  
  if (!id) {
    return null;
  }

  const handleExportCSV = async () => {
    try {
      const exportId = type === "event" ? eventId : meetId;
      const endpoint = type === "event" 
        ? `/api/events/${exportId}/export?format=csv`
        : `/api/meets/${exportId}/export?format=csv`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error("Failed to export CSV");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${type}-results.csv`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "CSV file has been downloaded",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export CSV file",
        variant: "destructive",
      });
    }
  };

  const handlePrintHTML = () => {
    try {
      const exportId = type === "event" ? eventId : meetId;
      const printRoute = type === "event"
        ? `/print/events/${exportId}`
        : `/print/meets/${exportId}`;
      
      // Open React print page in new tab (user gesture, so popup blockers allow it)
      const printWindow = window.open(printRoute, "_blank");
      
      if (!printWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups to print results",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Print page opened",
          description: "Print dialog will appear automatically",
        });
      }
    } catch (error) {
      console.error("Print error:", error);
      toast({
        title: "Print Failed",
        description: "Failed to open print view",
        variant: "destructive",
      });
    }
  };

  const handleSavePDF = () => {
    try {
      const exportId = type === "event" ? eventId : meetId;
      const printRoute = type === "event"
        ? `/print/events/${exportId}`
        : `/print/meets/${exportId}`;
      
      // Open React print page in new tab - user can use browser's print-to-PDF
      const pdfWindow = window.open(printRoute, "_blank");
      
      if (!pdfWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups to save as PDF",
          variant: "destructive",
        });
      } else {
        toast({
          title: "PDF Ready",
          description: "Use your browser's print dialog and select 'Save as PDF'",
        });
      }
    } catch (error) {
      console.error("PDF error:", error);
      toast({
        title: "PDF Failed",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={className}
          data-testid="button-export-menu"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="menu-export-options">
        <DropdownMenuLabel>Export Results</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleExportCSV}
          data-testid="menu-item-export-csv"
        >
          <FileText className="w-4 h-4 mr-2" />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleSavePDF}
          data-testid="menu-item-save-pdf"
        >
          <FileText className="w-4 h-4 mr-2" />
          Save as PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handlePrintHTML}
          data-testid="menu-item-print"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Results
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
