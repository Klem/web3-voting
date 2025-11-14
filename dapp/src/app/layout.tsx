import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RainbowKitAndWagmiProvider from "../providers/RainbowKitAndWagmiProvider";
import Layout from "@/components/shared/Layout";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Web3 Voting",
    description: "A beginner-friendly Web3 voting app to learn smart contract interactions with Ethereum",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
        <RainbowKitAndWagmiProvider>
            <Layout>
                {children}
            </Layout>
        </RainbowKitAndWagmiProvider>
        </body>
        </html>
    );
}
