import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaSearch, FaEnvelope, FaPaperPlane, FaUser } from 'react-icons/fa';
import { EmailService, Person } from '../services/emailService';
import { toast } from 'sonner';

interface EmailShareDialogProps {
  imageDataUrl: string;
  screenshotBlob?: Blob;
  onClose: () => void;
  onBack: () => void;
  embedded?: boolean;
}

const EmailShareDialog: React.FC<EmailShareDialogProps> = ({ 
  imageDataUrl, 
  screenshotBlob,
  onClose, 
  onBack,
  embedded = false,
}) => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [selectedPersons, setSelectedPersons] = useState<Person[]>([]);
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Shared Chat Conversation');
  const [emailMessage, setEmailMessage] = useState('');
  const [useManualInput, setUseManualInput] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Search for persons when query changes (abort stale requests)
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const searchPersons = async () => {
      if (!searchQuery.trim() || useManualInput) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await EmailService.searchPersons(searchQuery, controller.signal);
        if (!active || controller.signal.aborted) return;
        setSearchResults(results);
      } catch (error) {
        if ((error as any)?.name === 'AbortError') return;
        console.error('Error searching persons:', error);
        if (!active) return;
        setSearchResults([]);
      } finally {
        if (active) setIsSearching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchPersons();
    }, 300);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [searchQuery, useManualInput]);

  // Add person from search results
  const handleAddPerson = useCallback((person: Person) => {
    if (!selectedPersons.find(p => p.id === person.id)) {
      setSelectedPersons(prev => [...prev, person]);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [selectedPersons]);

  // Remove selected person
  const handleRemovePerson = useCallback((personId: string) => {
    setSelectedPersons(prev => prev.filter(p => p.id !== personId));
  }, []);

  // Add manual email
  const handleAddManualEmail = useCallback(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!manualEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!emailRegex.test(manualEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check if email already added
    if (selectedPersons.find(p => p.email === manualEmail)) {
      toast.error('This email is already added');
      return;
    }

    const newPerson: Person = {
      id: `manual-${Date.now()}`,
      name: manualEmail.split('@')[0],
      email: manualEmail,
    };

    setSelectedPersons(prev => [...prev, newPerson]);
    setManualEmail('');
  }, [manualEmail, selectedPersons]);

  // Handle send email
  const handleSendEmail = async () => {
    if (selectedPersons.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    if (!emailSubject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    setIsSending(true);
    try {
      // Prefer provided blob; fallback to fetching the data URL
      const blob: Blob = screenshotBlob
        ? screenshotBlob
        : await (await fetch(imageDataUrl)).blob();

      // Call email service to send email
      await EmailService.sendEmail({
        screenshot: blob,
        subject: emailSubject,
        message: emailMessage,
        recipients: selectedPersons.map(p => ({
          email: p.email,
          name: p.name,
        })),
      });

      toast.success('Email sent successfully!');
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to send email. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  // Build content and footer for reuse in embedded/standalone modes
  const content = (
    <div className="flex-1 overflow-y-auto p-6">
          {/* Toggle between search and manual input */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setUseManualInput(false)}
                className={`px-3 py-2 rounded-md transition-all duration-150 ${
                  !useManualInput
                    ? 'bg-accent-primary text-text-inverse'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                Search Person
              </button>
              <button
                onClick={() => setUseManualInput(true)}
                className={`px-3 py-2 rounded-md transition-all duration-150 ${
                  useManualInput
                    ? 'bg-accent-primary text-text-inverse'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                Manual Input
              </button>
            </div>
          </div>

          {/* Search or Manual Input */}
          {!useManualInput ? (
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-text-secondary">
                Search Recipients:
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                  <FaSearch />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 100)}
                  placeholder="Type to search by name or email..."
                  className="w-full pl-10 pr-3 py-3 bg-bg-secondary text-text-primary border border-border-primary rounded-md text-sm transition-all duration-150 hover:border-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)] focus:bg-bg-primary"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                    <div className="animate-spin">⚙</div>
                  </div>
                )}
                {/* Overlayed search results dropdown */}
                {searchFocused && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-bg-elevated border border-border-primary rounded-md max-h-[220px] overflow-y-auto shadow-lg z-tooltip">
                    {searchResults.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => handleAddPerson(person)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-all duration-150 text-left border-b border-border-primary last:border-b-0"
                      >
                        <div className="flex items-center justify-center w-10 h-10 bg-accent-light text-accent-primary rounded-full flex-shrink-0">
                          {person.avatar ? (
                            <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <FaUser />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary truncate">
                            {person.name}
                          </div>
                          <div className="text-xs text-text-tertiary truncate">
                            {person.email}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-text-secondary">
                Enter Email Address:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                    <FaEnvelope />
                  </div>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddManualEmail()}
                    placeholder="example@email.com"
                    className="w-full pl-10 pr-3 py-3 bg-bg-secondary text-text-primary border border-border-primary rounded-md text-sm transition-all duration-150 hover:border-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)] focus:bg-bg-primary"
                  />
                </div>
                <button
                  onClick={handleAddManualEmail}
                  className="px-4 py-3 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover active:scale-[0.98]"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Selected Recipients */}
          {selectedPersons.length > 0 && (
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-text-secondary">
                Recipients ({selectedPersons.length}):
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedPersons.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center gap-2 px-3 py-2 bg-accent-light text-accent-primary rounded-full text-sm"
                  >
                    <span className="font-medium">{person.name}</span>
                    <span className="text-xs opacity-75">({person.email})</span>
                    <button
                      onClick={() => handleRemovePerson(person.id)}
                      className="ml-1 flex items-center justify-center w-5 h-5 hover:bg-accent-primary hover:text-text-inverse rounded-full transition-all duration-150"
                      aria-label={`Remove ${person.name}`}
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Subject */}
          <div className="mb-4">
            <label htmlFor="email-subject" className="block mb-2 text-sm font-medium text-text-secondary">
              Subject:
            </label>
            <input
              id="email-subject"
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Enter email subject"
              className="w-full px-3 py-3 bg-bg-secondary text-text-primary border border-border-primary rounded-md text-sm transition-all duration-150 hover:border-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)] focus:bg-bg-primary"
            />
          </div>

          {/* Email Message */}
          <div className="mb-4">
            <label htmlFor="email-message" className="block mb-2 text-sm font-medium text-text-secondary">
              Message (Optional):
            </label>
            <textarea
              id="email-message"
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Add a message to your email..."
              rows={4}
              className="w-full px-3 py-3 bg-bg-secondary text-text-primary border border-border-primary rounded-md text-sm transition-all duration-150 hover:border-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)] focus:bg-bg-primary resize-none"
            />
          </div>

          {/* Preview Note */}
          <div className="p-3 bg-bg-secondary border border-border-primary rounded-md">
            <p className="text-xs text-text-tertiary leading-relaxed m-0">
              <strong>Note:</strong> The screenshot of your conversation will be attached to the email.
            </p>
          </div>
    </div>
  );

  const footer = (
    <div className="px-6 py-4 bg-bg-secondary border-t border-border-primary flex justify-end gap-3">
      {!embedded && (
        <button
          onClick={onBack}
          disabled={isSending}
          className="px-5 py-3 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:text-text-primary hover:border-text-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
      )}
      <button
        onClick={handleSendEmail}
        disabled={isSending || selectedPersons.length === 0}
        className="flex items-center gap-2 px-5 py-3 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
      >
        {isSending ? (
          <>
            <div className="animate-spin">⚙</div>
            <span>Sending...</span>
          </>
        ) : (
          <>
            <FaPaperPlane />
            <span>Send Email</span>
          </>
        )}
      </button>
    </div>
  );

  if (embedded) {
    return (
      <>
        {content}
        {footer}
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-tooltip p-4 animate-fade-in">
      <div className="bg-bg-elevated rounded-lg w-full max-w-[700px] shadow-lg flex flex-col animate-slide-up max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-bg-secondary border-b border-border-primary rounded-t-lg">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 p-0 bg-transparent border-none rounded-md text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary transition-all duration-150"
              aria-label="Go back"
            >
              ←
            </button>
            <h3 className="text-lg font-semibold text-text-primary m-0">Share via Email</h3>
          </div>
          <button 
            className="flex items-center justify-center w-8 h-8 p-0 bg-transparent border-none rounded-md text-text-tertiary text-2xl cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:text-text-primary" 
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>
        {content}
        {footer}
      </div>
    </div>
  );
};

export default EmailShareDialog;
