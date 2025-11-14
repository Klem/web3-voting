// app/voting/page.tsx
'use client';

import {useEffect, useMemo, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import Proposals from '@/components/shared/Proposals';
import Registration from '@/components/shared/Registration';
import Vote from '@/components/shared/Vote';
import Results from '@/components/shared/Results';

import {useAccount, useWaitForTransactionReceipt, useWriteContract} from 'wagmi';
import {CONTRACT_ADDRESS, CONTRACT_ABI} from '@/utils/constants';
import {useReadContract} from 'wagmi';
import {writeContract} from "@wagmi/core";

export default function VotingPage() {
    const {address, isConnected} = useAccount();
    const [activeTab, setActiveTab] = useState<'registration' | 'proposals' | 'vote' | 'results'>('registration');
    let [currentStatus, setCurrentStatus] = useState('');

    const {writeContract, data: hash, error: writeError, isPending} = useWriteContract();
    const {isLoading: isConfirming, isSuccess: isConfirmed} = useWaitForTransactionReceipt({hash});

    const statusNames = [
        'Enregistrement des votants',
        'Enregistrement des propositions',
        'Fin enregistrement propositions',
        'Session de vote en cours',
        'Fin session de vote',
        'Votes comptabilisés',
    ];

    let { data: statusInt, refetch: refetchStatus } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'workflowStatus',
    });

    // Vérifie si l'utilisateur est l'owner
    const {data: owner} = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'owner',
        query: { enabled: !!address },
    });

    const handleAdminAction = (fn: string) => () => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: fn
        });
        setCurrentStatus(statusNames[Number(status)]);
    }

    let status = statusInt !== undefined ? Number(statusInt) : 0;

    currentStatus = status !== undefined ? statusNames[Number(status)] : 'Chargement...';
    useEffect(() => {
        console.log("useEffect:", isConfirmed)
        if (isConfirmed) {
            refetchStatus();
            console.log("status", currentStatus)
        }
    }, [isConfirmed, refetchStatus]);

    useEffect(() => {
        if (status !== undefined) {
            setCurrentStatus(statusNames[status] || 'Inconnu');
        }
    }, [status]);


    // 2. Memoise the boolean – it will be stable across renders
    const isOwner = useMemo(
        () => !!address && owner === address,
        [address, owner]
    );

    console.log("Owner is: ", owner);
    console.log("Status is: ", status);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-center">Système de Vote Décentralisé</h1>
            <h2 className="text-3xl font-bold text-center">{currentStatus}</h2>

            {/* ADMIN PANEL */}
            {isOwner && (
                <div className="bg-black/30 p-6 rounded-xl space-y-3">
                    <h2 className="text-2xl font-bold mb-4">Panneau Admin</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Button onClick={handleAdminAction('startProposalsRegistering')}
                                variant={status !== 0 ? 'outline' : 'default'}
                                disabled={status !== 0 || isPending || isConfirming}
                                className="btn-admin"
                        >
                            {isPending || isConfirming ? 'En cours...' : 'Démarrer propositions'}
                        </Button>
                        <Button onClick={handleAdminAction('endProposalsRegistering')}
                                variant={status !== 1 ? 'outline' : 'default'}
                                disabled={status !== 1 || isPending || isConfirming}
                                className="btn-admin"
                        >
                            {isPending || isConfirming ? 'En cours...' : 'Clôturer propositions'}
                        </Button>
                        <Button onClick={handleAdminAction('startVotingSession')}
                                variant={status !== 2 ? 'outline' : 'default'}
                                disabled={status !== 2 || isPending || isConfirming}
                                className="btn-admin"
                        >
                            {isPending || isConfirming ? 'En cours...' : 'Démarrer vote'}
                        </Button>
                        <Button onClick={handleAdminAction('endVotingSession')}
                                variant={status !== 3 ? 'outline' : 'default'}
                                disabled={status !== 3 || isPending || isConfirming}
                                className="btn-admin"
                        >
                            {isPending || isConfirming ? 'En cours...' : 'Clôturer vote'}
                        </Button>
                        <Button onClick={handleAdminAction('tallyVotes')}
                                variant={status !== 4 ? 'outline' : 'default'}
                                disabled={status !== 4 || isPending || isConfirming}
                                className="btn-admin col-span-2 md:col-span-1"
                        >
                            {isPending || isConfirming ? 'En cours...' : 'Comptabiliser'}
                        </Button>
                    </div>
                </div>
            )}


            {/* Onglets */}
            <div className="flex flex-wrap gap-2 justify-center">
                <Button
                    variant={activeTab === 'registration' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('registration')}
                    disabled={!isOwner}
                >
                    Inscription
                </Button>
                <Button
                    variant={activeTab === 'proposals' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('proposals')}
                >
                    Propositions
                </Button>
                <Button
                    variant={activeTab === 'vote' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('vote')}
                >
                    Voter
                </Button>
                <Button
                    variant={activeTab === 'results' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('results')}
                >
                    Résultats
                </Button>
            </div>

            {/* Contenu */}
            <Card className="p-6">
                {activeTab === 'registration' && <Registration isOwner={isOwner}/>}
                {/*{activeTab === 'proposals' && <Proposals/>}*/}
                {/*{activeTab === 'vote' && <Vote/>}*/}
                {/*{activeTab === 'results' && <Results/>}*/}
            </Card>
        </div>
    );
}