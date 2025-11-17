// app/voting/components/Results.tsx
'use client';

import {useAccount, useReadContract} from 'wagmi';
import {Card} from '@/components/ui/card';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {CONTRACT_ADDRESS, CONTRACT_ABI} from '@/utils/constants';

export default function Results() {
    // On lit juste le status et le nombre de propositions
    const {data: status} = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'workflowStatus',
    });

    const {data: count} = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getProposalsCount',
    });

    const countNum = count ? Number(count) : 0;
    const isFinished = status === 5; // VotesTallied

    const { data:winningId } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'winningProposalID',

        query: { enabled: status === 5},
    });

    const winner = Number(winningId);

    // Si pas terminé → message simple
    if (!isFinished) {
        return (
            <AlertDescription className="text-lg">
                Les résultats seront affichés quand le vote sera terminé.
            </AlertDescription>

        );
    }

    // Si aucune proposition
    if (countNum === 0) {
        return (

            <AlertDescription className="text-lg">
                Aucune proposition.
            </AlertDescription>

        );
    }

    return (
        <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">Proposition #{winner}</h3>
            </div>
        </Card>
    );
}