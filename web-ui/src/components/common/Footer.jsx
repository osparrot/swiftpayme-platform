import React from 'react';
import { Link } from 'react-router-dom';
import { Separator } from '../ui/separator';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Twitter, 
  Facebook, 
  Instagram, 
  Linkedin,
  Shield,
  Lock,
  Award
} from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">S</span>
                </div>
              </div>
              <span className="text-xl font-bold text-white">SwiftPayMe</span>
            </div>
            <p className="text-sm leading-relaxed">
              Revolutionizing payments through physical asset tokenization. 
              Deposit gold, silver, and diamonds to receive instant fiat credit 
              and seamlessly purchase Bitcoin.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/assets" className="text-sm hover:text-white transition-colors">
                  Asset Deposit
                </Link>
              </li>
              <li>
                <Link to="/wallet" className="text-sm hover:text-white transition-colors">
                  Digital Wallet
                </Link>
              </li>
              <li>
                <Link to="/transactions" className="text-sm hover:text-white transition-colors">
                  Bitcoin Trading
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Multi-Currency Support
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Asset Tokenization
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Portfolio Management
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  API Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Security Guide
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Fee Schedule
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  Contact Support
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">
                  System Status
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-blue-400" />
                <span className="text-sm">support@swiftpayme.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-blue-400" />
                <span className="text-sm">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-blue-400 mt-0.5" />
                <span className="text-sm">
                  123 Financial District<br />
                  New York, NY 10004<br />
                  United States
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Trust Indicators */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-400" />
                <span className="text-sm">Bank-Level Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-green-400" />
                <span className="text-sm">256-bit SSL</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-green-400" />
                <span className="text-sm">Licensed & Regulated</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <img 
                src="/api/placeholder/80/40" 
                alt="PCI DSS Compliant" 
                className="h-8 opacity-70"
              />
              <img 
                src="/api/placeholder/80/40" 
                alt="SOC 2 Certified" 
                className="h-8 opacity-70"
              />
              <img 
                src="/api/placeholder/80/40" 
                alt="ISO 27001" 
                className="h-8 opacity-70"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-gray-800" />

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="text-sm text-gray-400">
            © {currentYear} SwiftPayMe. All rights reserved.
          </div>
          
          <div className="flex items-center space-x-6">
            <Link to="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link to="/cookies" className="text-sm text-gray-400 hover:text-white transition-colors">
              Cookie Policy
            </Link>
            <Link to="/compliance" className="text-sm text-gray-400 hover:text-white transition-colors">
              Compliance
            </Link>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-950 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            <strong>Risk Disclaimer:</strong> Trading and investing in cryptocurrencies and digital assets 
            involves substantial risk of loss and is not suitable for every investor. Past performance 
            does not guarantee future results. SwiftPayMe is not a bank and does not provide banking services. 
            Digital asset services are provided by SwiftPayMe Digital Assets LLC. 
            Please read our full risk disclosure before using our services.
          </p>
        </div>
      </div>
    </footer>
  );
};
