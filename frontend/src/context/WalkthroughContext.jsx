import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';
import { Outlet } from 'react-router-dom';

const WalkthroughContext = createContext(null);

export function useWalkthrough() {
  return useContext(WalkthroughContext);
}

// Custom Tooltip Component for premium UI
const CustomTooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
}) => {
  return (
    <div
      {...tooltipProps}
      className="bg-white rounded-2xl shadow-[0px_24px_60px_rgba(10,46,36,0.16)] border border-[#E8EAE8] overflow-hidden w-[calc(100vw-32px)] sm:w-80 max-w-[340px] z-[9999] pointer-events-auto transform transition-all duration-300"
    >
      <div className="p-6">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="bg-gradient-to-br from-[#0F6E56] to-[#0a4d3c] p-2.5 rounded-xl text-white shrink-0 mt-0.5 shadow-md">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            {step.title && (
              <h3 className="text-[16px] font-bold text-[#141A14] leading-tight tracking-tight">
                {step.title}
              </h3>
            )}
            <p className="text-[13px] text-[#4A544A] mt-2 leading-relaxed">
              {step.content}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#F1F3F1]">
          <button
            {...closeProps}
            className="text-[12px] font-semibold text-[#9EA89E] hover:text-[#4A544A] transition-colors"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                {...backProps}
                className="w-8 h-8 rounded-full bg-[#F3F4F3] text-[#4A544A] hover:bg-[#E8EAE8] flex items-center justify-center transition-colors font-medium"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <button
              {...primaryProps}
              className="px-4 h-9 rounded-full bg-[#0F6E56] text-white text-[13px] font-semibold hover:bg-[#0c5b47] flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              {index === 0 ? 'Get Started' : isLastStep ? 'Done' : 'Next'}
              {!isLastStep && <ChevronRight size={15} className="-mr-0.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Define predefined steps for Provider and Client portals
const predefinedTours = {
  provider: [
    {
      target: 'body',
      placement: 'center',
      title: 'Welcome to Groven',
      content: 'Let\'s take a quick tour of your new workspace and see how to manage your clients and requests.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="provider-stats"]',
      title: 'Track Performance',
      content: 'Get a bird\'s-eye view of your client activity, open requests, and completed work this week.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="provider-clients"]',
      title: 'Manage Clients',
      content: 'Invite new clients and track their activity and requests all in one place.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="provider-requests"]',
      title: 'Handle Requests',
      content: 'Review and manage all incoming tasks. Our AI automatically tags and summarizes them for you.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="provider-feed"]',
      title: 'Real-time Feed',
      content: 'Stay updated instantly when clients submit new requests, send messages, or view your deliveries.',
      disableBeacon: true,
    },
  ],
  client: [
    {
      target: 'body',
      placement: 'center',
      title: 'Welcome to your Portal',
      content: 'Let\'s take a quick tour to see how you can request work, track progress, and communicate with your provider.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="client-stats"]',
      title: 'Your Overview',
      content: 'Keep track of your active projects and total requests managed by your provider.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="client-new-request"]',
      title: 'Submit a Request',
      content: 'Need something done? Click here to fill out a brief and send a new request to your provider.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="client-requests"]',
      title: 'Track Progress',
      content: 'Monitor the status of your ongoing requests and view past deliveries all in one place.',
      disableBeacon: true,
    },
  ],
  provider_request_detail: [
    {
      target: 'body',
      placement: 'center',
      title: 'Request Details',
      content: 'Welcome to the Request detail view! Here you can manage everything related to a specific client task. Let\'s take a quick tour.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="provider-request-status"]',
      title: 'Status Pipeline',
      content: 'Easily update the status of this request as it moves through your workflow.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="provider-request-urgent"]',
      title: 'Urgent Flag',
      content: 'Mark this request as urgent to prioritize it in your pipeline. It will be highlighted for you.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="provider-request-due-date"]',
      title: 'Set Deadlines',
      content: 'Click here to set or change the due date for this request. Keeping deadlines clear helps manage client expectations.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="provider-request-details"]',
      title: 'Request Scope & Files',
      content: 'Review the full description, client attachments, and AI-generated summaries all in one place.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="provider-request-internal-notes"]',
      title: 'Internal Notes',
      content: 'Jot down private notes or checklist items here. These are completely hidden from the client.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="provider-request-chat"]',
      title: 'Client Chat & Activity',
      content: 'Communicate directly with your client and start video calls instantly.',
      disableBeacon: true,
      placement: 'left',
    },
  ],
  client_request_detail: [
    {
      target: 'body',
      placement: 'center',
      title: 'Your Request Hub',
      content: 'Welcome to your request dashboard! This is where you track progress, communicate with your provider, and review deliverables.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="client-request-progress"]',
      title: 'Track Progress',
      content: 'See exactly where your request stands in the provider\'s workflow.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="client-request-chat"]',
      title: 'Discussion & Video',
      content: 'Chat directly with your provider or start a secure video call here.',
      disableBeacon: true,
      placement: 'left',
    },
  ]
};

export function WalkthroughProvider({ children }) {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);
  const [storageKey, setStorageKey] = useState(null);

  const startWalkthrough = useCallback((tourName) => {
    const tourSteps = predefinedTours[tourName];
    if (tourSteps) {
      setRun(false); // Force stop any running instance
      setSteps(tourSteps);

      const key = `grove_walkthrough_${tourName}`;
      setStorageKey(key);

      // Mark as completed immediately so it doesn't run again on reload
      localStorage.setItem(key, 'completed');

      // Delay slightly to ensure elements are rendered
      setTimeout(() => {
        setRun(true);
      }, 500);
    }
  }, []);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
    }
  };

  return (
    <WalkthroughContext.Provider value={{ startWalkthrough }}>
      <Joyride
        key={storageKey || 'default'}
        steps={steps}
        run={run}
        continuous={true}
        scrollToFirstStep={true}
        showProgress={false}
        showSkipButton={true}
        disableOverlayClose={true}
        spotlightPadding={4}
        styles={{
          options: {
            zIndex: 9999,
            primaryColor: '#0F6E56',
          },
          spotlight: {
            borderRadius: '12px',
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }
        }}
        tooltipComponent={CustomTooltip}
        callback={handleJoyrideCallback}
      />
      {children ?? <Outlet />}
    </WalkthroughContext.Provider>
  );
}
