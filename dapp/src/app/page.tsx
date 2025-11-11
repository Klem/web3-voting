'use client';
import Voting from "@/app/components/shared/Voting";
import NotConnected from "@/app/components/shared/NotConnected";
import { useAccount } from "wagmi";

export default function Home() {

    const { isConnected } = useAccount();
    return (
        <>
            {isConnected ? (
                <Voting />
            ) : (
                <NotConnected />
            )}
        </>
    );
}