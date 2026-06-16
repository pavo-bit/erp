"use client";

import { useState } from "react";
import { Shield, Mail, MessageCircle, Smartphone, Check, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ConsentSettingsPage() {
  const [preferences, setPreferences] = useState({
    email: true,
    sms: true,
    whatsapp: false,
    marketing: false
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call to PUT /api/v1/preferences
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Consent & Preferences</h1>
        <p className="text-gray-500">Manage your communication channels and data privacy settings.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-4 items-start">
        <Shield className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-blue-900 mb-1">DPDP Act Compliance</h4>
          <p className="text-sm text-blue-800 leading-relaxed">
            SSVM College Square complies with the Digital Personal Data Protection Act. 
            The data collected is strictly used for academic administration, student safety (transport tracking), 
            and official school communications. You maintain full control over your optional communication preferences below.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Communication Channels</h2>
          <p className="text-sm text-gray-500 mt-1">Select how you want to receive official school updates.</p>
        </div>

        <div className="divide-y divide-gray-100">
          <div className="p-6 flex items-center justify-between">
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-gray-50 text-gray-600 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-500">Fee receipts, report cards, and official circulars.</p>
              </div>
            </div>
            <ToggleSwitch active={preferences.email} onClick={() => handleToggle('email')} />
          </div>

          <div className="p-6 flex items-center justify-between">
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-gray-50 text-gray-600 rounded-xl">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">SMS Alerts</h4>
                <p className="text-sm text-gray-500">Attendance alerts, bus boarding, and emergency notices.</p>
              </div>
            </div>
            <ToggleSwitch active={preferences.sms} onClick={() => handleToggle('sms')} />
          </div>

          <div className="p-6 flex items-center justify-between">
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">WhatsApp Integration</h4>
                <p className="text-sm text-gray-500">Opt-in to receive notifications via WhatsApp.</p>
              </div>
            </div>
            <ToggleSwitch active={preferences.whatsapp} onClick={() => handleToggle('whatsapp')} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Data Processing Consent</h2>
        </div>

        <div className="p-6 flex items-center justify-between">
          <div className="flex gap-4 items-start max-w-2xl">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Promotional Communications</h4>
              <p className="text-sm text-gray-500">
                I consent to receive promotional materials, newsletters about extracurricular programs, 
                and partner offerings from the SSVM Group of Institutions.
              </p>
            </div>
          </div>
          <ToggleSwitch active={preferences.marketing} onClick={() => handleToggle('marketing')} />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          <span>Save Preferences</span>
        </button>
      </div>
    </div>
  );
}

function ToggleSwitch({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-12 h-6 rounded-full relative transition-colors ${active ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <motion.div 
        layout
        className="w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm"
        animate={{ left: active ? "26px" : "4px" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
