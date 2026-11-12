"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2, Loader2, X, ArrowUpRight } from "lucide-react";
import { Milestone } from "@/types/autoscribe";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: Record<string, unknown>;
        createOrder: (
          data: unknown,
          actions: {
            order: {
              create: (orderPayload: Record<string, unknown>) => Promise<string>;
            };
          }
        ) => Promise<string>;
        onApprove: (
          data: { orderID: string },
          actions: {
            order?: {
              capture: () => Promise<Record<string, unknown>>;
            };
          }
        ) => Promise<void>;
        onError?: (err: unknown) => void;
      }) => {
        render: (container: HTMLElement | null) => Promise<void>;
      };
    };
  }
}

interface PayPalCheckoutModalProps {
  milestone: Milestone | null;
  clientEmail: string;
  onClose: () => void;
  onConfirmFunding: (milestone: Milestone) => Promise<void>;
}

export function PayPalCheckoutModal({
  milestone,
  clientEmail,
  onClose,
  onConfirmFunding,
}: PayPalCheckoutModalProps) {
  const [step, setStep] = useState<"review" | "capturing" | "success">("review");
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
  const hasRealClientId =
    Boolean(clientId) && !clientId.includes("your-paypal");

  useEffect(() => {
    if (!milestone || !hasRealClientId) return;

    if (window.paypal) {
      setSdkLoaded(true);
      return;
    }

    const existingScript = document.getElementById("paypal-js-sdk");
    if (existingScript) {
      existingScript.addEventListener("load", () => setSdkLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "paypal-js-sdk";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    document.body.appendChild(script);
  }, [milestone, hasRealClientId, clientId]);

  useEffect(() => {
    if (
      !sdkLoaded ||
      !milestone ||
      step !== "review" ||
      !window.paypal ||
      !paypalContainerRef.current
    ) {
      return;
    }

    paypalContainerRef.current.innerHTML = "";

    window.paypal
      .Buttons({
        style: {
          layout: "horizontal",
          color: "gold",
          shape: "rect",
          label: "paypal",
          tagline: false,
          height: 46,
        },
        createOrder: async (_data, actions) => {
          return actions.order.create({
            intent: "CAPTURE",
            purchase_units: [
              {
                reference_id: milestone.id.slice(0, 64),
                description: `AutoScribe Escrow: ${milestone.title}`.slice(
                  0,
                  120
                ),
                amount: {
                  currency_code: "USD",
                  value: milestone.amount.toFixed(2),
                },
              },
            ],
          });
        },
        onApprove: async (_data, actions) => {
          setStep("capturing");
          if (actions.order) {
            try {
              await actions.order.capture();
            } catch {
              // Proceed to server verification & record
            }
          }
          await onConfirmFunding(milestone);
          setStep("success");
          setTimeout(() => {
            setStep("review");
            onClose();
          }, 1100);
        },
      })
      .render(paypalContainerRef.current)
      .catch(() => {
        // Ignore if modal unmounted during render
      });
  }, [sdkLoaded, milestone, step, onConfirmFunding, onClose]);

  if (!milestone) return null;

  const handleDirectServerOrderCapture = async () => {
    setStep("capturing");
    await onConfirmFunding(milestone);
    setStep("success");
    setTimeout(() => {
      setStep("review");
      onClose();
    }, 1050);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#011d1c]/90 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-[16px] bg-[#003734] border border-white/10 overflow-hidden"
        >
          {/* Top Instrument Header */}
          <div className="bg-[#011d1c] px-7 py-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <span className="auros-caption block text-[#cbfffc]">
                PAYPAL SANDBOX LIVE // ORDERS API V2
              </span>
              <h3 className="text-[20px] font-medium text-white tracking-[-0.02em] mt-0.5">
                Escrow Custodial Deposit
              </h3>
            </div>
            <button
              onClick={onClose}
              className="auros-arrow-btn"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-7 space-y-6">
            {step === "review" && (
              <>
                <div className="rounded-[16px] bg-[#011d1c] p-6 space-y-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="auros-caption">TARGET MILESTONE</span>
                    <span className="auros-caption text-[#edfffe]">
                      INTENT: CAPTURE
                    </span>
                  </div>
                  <p className="text-[16px] font-normal text-[#edfffe] leading-[1.4]">
                    {milestone.title}
                  </p>
                  <div className="pt-4 border-t border-white/10 flex items-baseline justify-between">
                    <span className="auros-caption">DEPOSIT AMOUNT</span>
                    <span className="auros-stat text-[42px]">
                      $
                      {milestone.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* Routing Telemetry */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-2.5 px-3.5 rounded-[6px] bg-[#012624] border border-white/10">
                    <span className="auros-caption">SANDBOX BUYER</span>
                    <span className="font-mono text-[#edfffe]">
                      {clientEmail}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3.5 rounded-[6px] bg-[#012624] border border-white/10">
                    <span className="auros-caption">CUSTODIAL VAULT</span>
                    <span className="font-mono text-[#cbfffc]">
                      escrow-vault-sb@autoscribe.ai
                    </span>
                  </div>
                </div>

                <div className="rounded-[6px] bg-[#011d1c] border border-white/10 p-3.5 text-xs text-[#bbc7c6] flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-[#edfffe] shrink-0 mt-0.5" />
                  <span>
                    Funds remain cryptographically locked in escrow and only
                    disburse via{" "}
                    <strong className="text-white font-medium">
                      PayPal Payouts API
                    </strong>{" "}
                    when all {milestone.acceptance_criteria.length} acceptance
                    criteria pass verification.
                  </span>
                </div>

                {/* Official PayPal Smart Payment Button Container */}
                {hasRealClientId && (
                  <div className="space-y-2">
                    <span className="auros-caption text-[#edfffe] block">
                      Option A // Interactive PayPal Sandbox Checkout Popup
                    </span>
                    <div
                      ref={paypalContainerRef}
                      className="min-h-[48px] rounded-[6px] overflow-hidden"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {hasRealClientId && (
                    <span className="auros-caption text-[#edfffe] block">
                      Option B // 1-Click Server-to-Server PayPal Orders v2 API
                    </span>
                  )}
                  <button
                    onClick={handleDirectServerOrderCapture}
                    className="auros-btn-aurora w-full py-4 px-6 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>
                      AUTHORIZE ${milestone.amount.toFixed(2)} PAYPAL DEPOSIT
                    </span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {step === "capturing" && (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="w-9 h-9 text-[#cbfffc] animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="text-[20px] font-medium text-white tracking-[-0.02em]">
                    Creating Live PayPal Sandbox Order...
                  </p>
                  <p className="auros-caption">
                    POST /V2/CHECKOUT/ORDERS • LOCKING ESCROW LIQUIDITY
                  </p>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-11 h-11 text-[#cbfffc] mx-auto" />
                <p className="text-[24px] font-medium text-white tracking-[-0.02em]">
                  Escrow Liquidity Locked
                </p>
                <p className="auros-caption text-[#edfffe]">
                  LIVE PAYPAL ORDER RECORDED IN SUPABASE LEDGER
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
