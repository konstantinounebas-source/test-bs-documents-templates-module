import React from "react";
import OCRVerificationModal from "./OCRVerificationModal";
import OCRTeamsTimeVerificationModal from "./OCRTeamsTimeVerificationModal";
import OCRSubAssemblyVerificationModal from "./OCRSubAssemblyVerificationModal";

export default function OCRModalsSection({
  // Production
  showOcrModal,
  ocrTargetAtt,
  currentProductionCacheId,
  viewProductionOcrResult,
  handleOcrConfirm,
  handleOcrSkip,
  bundleItemCodes,
  selDept,
  // Teams Time
  showTeamsTimeOcrModal,
  currentTeamsTimeCacheId,
  viewTeamsTimeOcrResult,
  handleTeamsTimeOcrConfirm,
  handleTeamsTimeOcrSkip,
  // Sub-Assembly
  showSubAssemblyModal,
  currentSubAssemblyCacheId,
  viewSubAssemblyOcrResult,
  handleSubAssemblyOcrConfirm,
  handleSubAssemblyOcrSkip,
}) {
  return (
    <>
      {/* OCR Verification Modal - Production Form (On-Demand) */}
      {showOcrModal && ocrTargetAtt && (
        <OCRVerificationModal
          key={`${ocrTargetAtt?.id || "none"}-${currentProductionCacheId || "manual"}`}
          open={showOcrModal}
          onClose={() => { }} 
          fileUrl={ocrTargetAtt.file_url}
          fileName={ocrTargetAtt.file_name}
          ocrResult={viewProductionOcrResult || {}}
          onConfirm={handleOcrConfirm}
          onSkip={handleOcrSkip}
          department={selDept || ocrTargetAtt?.department}
          departments={[]}
          availableItemCodes={bundleItemCodes}
        />
      )}

      {/* OCR Verification Modal - Teams Time Form (On-Demand) */}
      {showTeamsTimeOcrModal && ocrTargetAtt && (
        <OCRTeamsTimeVerificationModal
          key={`${ocrTargetAtt?.id || "none"}-${currentTeamsTimeCacheId || "manual"}`}
          open={showTeamsTimeOcrModal}
          onClose={() => { }} 
          fileUrl={ocrTargetAtt.file_url}
          fileName={ocrTargetAtt.file_name}
          ocrResult={viewTeamsTimeOcrResult || {}}
          onConfirm={handleTeamsTimeOcrConfirm}
          onSkip={handleTeamsTimeOcrSkip}
          totalPages={1}
          defaultPage={1}
          detectedForms={null}
        />
      )}

      {/* OCR Verification Modal - Sub-Assembly Form (On-Demand) */}
      {showSubAssemblyModal && ocrTargetAtt && (
        <OCRSubAssemblyVerificationModal
          key={`${ocrTargetAtt?.id || "none"}-${currentSubAssemblyCacheId || "manual"}`}
          open={showSubAssemblyModal}
          onClose={() => { }} 
          fileUrl={ocrTargetAtt.file_url}
          fileName={ocrTargetAtt.file_name}
          ocrResult={viewSubAssemblyOcrResult || {}}
          onConfirm={handleSubAssemblyOcrConfirm}
          onSkip={handleSubAssemblyOcrSkip}
        />
      )}
    </>
  );
}