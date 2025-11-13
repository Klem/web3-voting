// app/voting/page.tsx
'use client';

import {useMemo, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import Proposals from '@/components/shared/Proposals';
import Registration from '@/components/shared/Registration';
import Vote from '@/components/shared/Vote';
import Results from '@/components/shared/Results';

import {useAccount} from 'wagmi';
import {CONTRACT_ADDRESS, CONTRACT_ABI} from '@/utils/constants';
import {useReadContract} from 'wagmi';

export default function VotingPage() {
    const {address, isConnected} = useAccount();
    const [activeTab, setActiveTab] = useState<'registration' | 'proposals' | 'vote' | 'results'>('registration');

    // Vérifie si l'utilisateur est l'owner
    const {data: owner} = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'owner',
        query: { enabled: !!address },
    });

    // 2. Memoise the boolean – it will be stable across renders
    const isOwner = useMemo(
        () => !!address && owner === address,
        [address, owner]
    );

    console.log("Owner is:", owner);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-center">Système de Vote Décentralisé</h1>

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