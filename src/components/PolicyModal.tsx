import { ShieldCheck, X, FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React from 'react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PolicyModal({ isOpen, onClose }: PolicyModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full h-[90vh] sm:h-[85vh] sm:max-w-3xl bg-white sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-950 p-8 text-white relative shrink-0">
              <div className="absolute top-0 right-0 p-8">
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                   <X size={24} />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                   <ShieldCheck size={28} />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Policies & Terms</h2>
              </div>
              <p className="text-slate-400 text-sm font-medium">Complete Website Policies for Pbazar</p>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50">
              <div className="prose prose-sm prose-slate max-w-none space-y-6">
                <div>
                  <p className="text-sm text-slate-500 italic mb-4">Effective Date: July 5, 2026</p>
                  
                  <h3 className="text-lg font-bold text-slate-900 mb-2">1. Introduction</h3>
                  <p className="text-slate-700 leading-relaxed text-sm">Welcome to Pbazar. By accessing or using our website, you agree to these policies, terms, and conditions. If you do not agree with any part of these policies, please do not use our website or services.</p>
                </div>

                <hr className="border-slate-200" />

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-orange-500"/> Privacy Policy
                  </h3>
                  
                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Information We Collect</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-3">We may collect:</p>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-4">
                    <li>Full name</li>
                    <li>Email address</li>
                    <li>Mobile number</li>
                    <li>Billing and shipping address</li>
                    <li>Payment information (processed securely through trusted payment providers)</li>
                    <li>Order history</li>
                    <li>Device, browser, IP address, and usage information</li>
                  </ul>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">How We Use Your Information</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-3">Your information is used to:</p>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-4">
                    <li>Process and deliver your orders</li>
                    <li>Provide customer support</li>
                    <li>Improve our website and services</li>
                    <li>Prevent fraud and unauthorized activity</li>
                    <li>Send order updates and promotional offers (with your consent)</li>
                  </ul>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Information Sharing</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-3">We never sell your personal information. We may share your information only with:</p>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-4">
                    <li>Delivery partners</li>
                    <li>Payment service providers</li>
                    <li>Government authorities when legally required</li>
                  </ul>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Data Security</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">We implement appropriate technical and organizational measures to protect your personal information. However, no online platform can guarantee absolute security.</p>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Cookies</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">We use cookies to improve website performance, remember your preferences, and analyze website traffic.</p>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Your Rights</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-3">You may request to:</p>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-4">
                    <li>Access your personal information</li>
                    <li>Correct inaccurate information</li>
                    <li>Delete your account (where legally permitted)</li>
                    <li>Withdraw marketing consent</li>
                  </ul>
                </div>

                <hr className="border-slate-200" />

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-orange-500"/> Terms & Conditions
                  </h3>
                  
                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Account Responsibility</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">You are responsible for maintaining the confidentiality of your account credentials.</p>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Product Information</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">We strive to provide accurate product descriptions, images, and prices. Minor variations may occur.</p>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Pricing</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">Prices may change without prior notice.</p>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Orders</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">Pbazar reserves the right to accept, reject, or cancel any order due to pricing errors, stock issues, fraud prevention, or legal requirements.</p>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Payments</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">Payments must be completed using approved payment methods.</p>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Intellectual Property</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">All website content including logos, text, graphics, and software belongs to Pbazar unless otherwise stated.</p>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Prohibited Activities</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-3">Users may not:</p>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-4">
                    <li>Use the website illegally</li>
                    <li>Attempt unauthorized access</li>
                    <li>Upload malicious software</li>
                    <li>Copy or reproduce website content without permission</li>
                  </ul>
                </div>

                <hr className="border-slate-200" />

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-orange-500"/> Shipping Policy
                  </h3>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-4">
                    <li>Orders are processed within 1–3 business days.</li>
                    <li>Delivery times vary depending on your location.</li>
                    <li>Shipping charges are displayed during checkout.</li>
                    <li>Delivery delays caused by natural disasters, strikes, or courier issues are beyond our control.</li>
                  </ul>
                </div>

                <hr className="border-slate-200" />

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-orange-500"/> Return & Refund Policy
                  </h3>
                  
                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Eligible Returns</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-3">Products may be returned within 7 days if:</p>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-4">
                    <li>Wrong item delivered</li>
                    <li>Damaged product received</li>
                    <li>Manufacturing defect</li>
                    <li>Product significantly different from its description</li>
                  </ul>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">Returned items must be unused, with original packaging and accessories.</p>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Non-Returnable Items</h4>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-4">
                    <li>Used products</li>
                    <li>Customized products</li>
                    <li>Digital products</li>
                    <li>Products damaged by customer misuse</li>
                  </ul>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Refund Process</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">Approved refunds are processed within 7–14 business days through the original payment method whenever possible.</p>
                </div>

                <hr className="border-slate-200" />

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-orange-500"/> Cancellation Policy
                  </h3>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">Customers may request cancellation before the order has been shipped.</p>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">Once shipped, orders cannot be cancelled but may qualify for return according to the Return Policy.</p>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">Pbazar may cancel orders involving fraud, pricing mistakes, stock shortages, or legal issues.</p>
                </div>

                <hr className="border-slate-200" />

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-orange-500"/> Warranty Policy
                  </h3>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">Manufacturer warranties apply only where specifically stated on the product page.</p>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">Pbazar does not provide additional warranties unless clearly mentioned.</p>
                </div>

                <hr className="border-slate-200" />

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Info size={18} className="text-orange-500"/> Additional Legalities
                  </h3>
                  
                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Limitation of Liability</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">Pbazar shall not be liable for indirect, incidental, or consequential damages resulting from the use of our website, products, or services.</p>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Governing Law</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">These policies are governed by the laws of Bangladesh.</p>

                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Changes to These Policies</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">Pbazar may update these policies at any time. Updated versions become effective immediately upon publication.</p>
                  
                  <h4 className="font-semibold text-slate-900 mb-1 text-sm">Contact Us</h4>
                  <p className="text-slate-700 leading-relaxed text-sm mb-4">For questions regarding these policies, returns, refunds, or customer support, please contact us through our official customer service channels. Thank you for shopping with Pbazar.</p>
                </div>

              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 flex justify-end shrink-0">
               <button 
                 onClick={onClose}
                 className="px-8 py-3 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
               >
                 I Understand
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
