-- Migration: Add split payments columns to sales and payment_method to cash_movements

ALTER TABLE public.sales 
ADD COLUMN cash_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN transfer_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN card_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN credit_amount DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.cash_movements
ADD COLUMN payment_method TEXT DEFAULT 'cash';
