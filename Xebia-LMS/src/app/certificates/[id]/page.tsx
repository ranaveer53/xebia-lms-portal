"use client";

import React, { useState, useEffect, use, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiService } from "../../../lib/apiService";
import { Certificate } from "../../../types";
import CertificateTemplate from "../../../components/certificates/CertificateTemplate";
import { ArrowLeft, Download, Award, ShieldCheck } from "lucide-react";

interface CertificatePreviewPageProps {
  params: Promise<{ id: string }>;
}

export default function CertificatePreviewPage({ params }: CertificatePreviewPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const certificateId = resolvedParams.id;

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [scale, setScale] = useState(0.8);
  const searchParams = useSearchParams();
  const autoDownloadDone = useRef(false);

  // Fetch certificate details
  useEffect(() => {
    if (certificateId) {
      setLoading(true);
      apiService.getCertificateById(certificateId)
        .then((cert) => {
          setCertificate(cert);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error loading certificate:", err);
          alert("Certificate not found or failed to load.");
          router.push("/certificates");
        });
    }
  }, [certificateId, router]);

  // Auto-trigger download if ?download=true is in URL
  useEffect(() => {
    if (!loading && certificate && searchParams.get("download") === "true" && !autoDownloadDone.current) {
      autoDownloadDone.current = true;
      // Small delay to let the certificate render fully before capturing
      setTimeout(() => handleDownloadPDF(), 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, certificate, searchParams]);

  // Handle scaling based on viewport size
  useEffect(() => {
    const handleResize = () => {
      const wrapper = document.getElementById("cert-preview-wrapper");
      if (wrapper) {
        const wrapperWidth = wrapper.clientWidth;
        // Standard template width is 1123px.
        const calculatedScale = Math.min((wrapperWidth - 48) / 1123, 1);
        setScale(calculatedScale);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [loading]);

  const handleDownloadPDF = async () => {
    if (!certificate || downloading) return;
    setDownloading(true);

    // Temporarily mock document.styleSheets to be empty so html2canvas only uses inline styles and ignores tailwind v4 stylesheets with oklch/oklab
    const originalStyleSheets = document.styleSheets;
    Object.defineProperty(document, "styleSheets", {
      get: () => [],
      configurable: true
    });

    let printContainer: HTMLDivElement | null = null;
    try {
      const element = document.getElementById("certificate-container");
      if (!element) throw new Error("Certificate element not found");

      // Clone the certificate element to avoid any page scale transforms interfering
      const clonedElement = element.cloneNode(true) as HTMLElement;
      
      // Create a hidden print container offscreen
      printContainer = document.createElement("div");
      printContainer.style.position = "fixed";
      printContainer.style.left = "-9999px";
      printContainer.style.top = "-9999px";
      printContainer.style.width = "1123px";
      printContainer.style.height = "794px";
      printContainer.appendChild(clonedElement);
      document.body.appendChild(printContainer);

      // Wait for all images inside the cloned element to load
      const images = Array.from(clonedElement.getElementsByTagName("img"));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      );

      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      // Capture the certificate cloned element with print settings
      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFFFFF",
        logging: false,
        width: 1123,
        height: 794,
        windowWidth: 1123,
        windowHeight: 794
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      // A4 Landscape dimensions are 297mm x 210mm
      pdf.addImage(imgData, "PNG", 0, 0, 297, 210, undefined, "FAST");
      pdf.save(`Xebia_Certificate_${certificate.studentName.replace(/\s+/g, "_")}.pdf`);

      // Trigger background call to increment download count
      await apiService.getCertificateDownloadUrl(certificate.id);
      
      // Update state local downloadCount
      setCertificate(prev => prev ? { ...prev, downloadCount: prev.downloadCount + 1 } : null);
    } catch (err) {
      console.error("PDF download failure:", err);
      alert("Failed to render PDF. Please try again.");
    } finally {
      // Clean up print container
      if (printContainer && printContainer.parentNode) {
        printContainer.parentNode.removeChild(printContainer);
      }
      // Restore document.styleSheets immediately
      Object.defineProperty(document, "styleSheets", {
        get: () => originalStyleSheets,
        configurable: true
      });
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-[#84117C] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-text-muted uppercase tracking-widest animate-pulse">Loading Certificate Preview...</span>
      </div>
    );
  }

  if (!certificate) return null;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 border border-border rounded-xl text-text-muted hover:bg-white hover:text-[#84117C] transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <Award size={20} className="text-[#84117C]" />
              Certificate Preview
            </h1>
            <p className="text-xs text-text-muted font-semibold mt-0.5">
              Subject: {certificate.subject || certificate.assessmentTitle || "General Curriculum"}
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="bg-[#84117C] hover:bg-[#6c0e66] disabled:opacity-55 text-white font-bold text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all w-full sm:w-auto uppercase"
        >
          {downloading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download size={14} /> Download PDF
            </>
          )}
        </button>
      </div>

      {/* Main Preview Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Scaled Certificate Canvas */}
        <div className="lg:col-span-3 bg-white border border-border p-6 rounded-3xl shadow-xs flex flex-col items-center">
          <div 
            id="cert-preview-wrapper" 
            className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 overflow-hidden relative flex justify-center"
          >
            <div 
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                width: "1123px",
                height: "794px",
                marginBottom: `-${794 * (1 - scale)}px`
              }}
              className="transition-transform duration-100 flex-shrink-0"
            >
              <CertificateTemplate certificate={certificate} />
            </div>
          </div>
        </div>

        {/* Right Column: Verification Panel */}
        <div className="bg-white border border-border p-6 rounded-3xl shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 text-emerald-600">
            <ShieldCheck size={20} />
            <span className="text-sm font-black uppercase tracking-wider">Secured Credentials</span>
          </div>

          <div className="space-y-4 text-xs font-semibold text-zinc-700">
            <div className="pb-3 border-b border-border/55">
              <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Candidate</span>
              <span className="text-sm font-bold text-foreground block mt-1">{certificate.studentName}</span>
            </div>

            <div className="pb-3 border-b border-border/55">
              <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Subject Title</span>
              <span className="text-sm font-bold text-foreground block mt-1">
                {certificate.subject || certificate.assessmentTitle || "General Curriculum"}
              </span>
            </div>

            <div className="pb-3 border-b border-border/55">
              <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Evaluation Score</span>
              <span className="text-sm font-bold text-foreground block mt-1">
                {certificate.percentage.toFixed(2)}%
              </span>
            </div>

            <div className="pb-3 border-b border-border/55">
              <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Total Downloads</span>
              <span className="text-sm font-bold text-foreground block mt-1">{certificate.downloadCount}</span>
            </div>

            <div>
              <span className="text-[10px] text-text-muted font-bold block uppercase tracking-wider">Verification ID</span>
              <span className="text-[10px] text-zinc-400 font-mono block mt-1 uppercase break-all select-all font-semibold">{certificate.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
