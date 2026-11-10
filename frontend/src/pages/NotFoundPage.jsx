import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  // Animation variants for staggered children rendering
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const floatVariants = {
    animate: {
      y: [0, -15, 0],
      transition: {
        duration: 4,
        ease: 'easeInOut',
        repeat: Infinity,
      },
    },
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-6 font-sans"
      style={{ backgroundColor: '#F7F8F7', color: '#141A14' }} // Surface / Page BG & Text Primary
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-md w-full text-center"
      >
        {/* Floating 404 Graphic */}
        <motion.div variants={floatVariants} animate="animate" className="mb-8">
          <h1 
            style={{ color: '#0F6E56', fontSize: '8rem', lineHeight: '1' }} 
            className="font-bold tracking-tighter"
          >
            404
          </h1>
        </motion.div>

        {/* Text Content */}
        <motion.h2 
          variants={itemVariants}
          className="text-2xl md:text-3xl font-medium mb-4"
          style={{ color: '#141A14' }} // Text Primary
        >
          Page not found
        </motion.h2>
        
        <motion.p 
          variants={itemVariants}
          className="text-base mb-8"
          style={{ color: '#4A544A' }} // Text Secondary
        >
          Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or perhaps the URL is incorrect.
        </motion.p>

        {/* Action Buttons */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-colors border"
            style={{ 
              backgroundColor: 'transparent',
              borderColor: '#E8EAE8', // Border Default
              color: '#4A544A' 
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E8EAE8'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-colors text-white shadow-sm"
            style={{ backgroundColor: '#0F6E56' }} // Groven 500
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#085041'} // Groven 700
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0F6E56'}
          >
            Return Home
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}