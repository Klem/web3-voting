// app/voting/components/Results.tsx
'use client';

import { useReadContract } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/utils/constants';

export default function Results() {
    // On lit juste le status et le nombre de propositions
    const { data: status } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'workflowStatus',
    });

    const { data: count } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getProposalsCount',
    });

    const countNum = count ? Number(count) : 0;
    const isFinished = status === 4; // VotesTallied

    // Si pas terminé → message simple
    if (!isFinished) {
        return (
            <div className="p-8 text-center">
                <Alert>
                    <AlertDescription className="text-lg">
                        Les résultats seront affichés quand le vote sera terminé.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Si aucune proposition
    if (countNum === 0) {
        return (
            <div className="p-8 text-center">
                <Alert>
                    <AlertDescription className="text-lg">
                        Aucune proposition.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold text-center mb-8">Résultats du vote</h1>

            {/* Toutes les propositions */}
            {Array.from({ length: countNum }).map((_, i) => (
                <ProposalResult key={i} id={i} totalProposals={countNum} />
            ))}
        </div>
    );
}

// Un petit composant séparé pour chaque proposition → plus de problème de hooks
function ProposalResult({ id, totalProposals }: { id: number; totalProposals: number }) {
    const { data, isLoading } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getOneProposal',
        args: [BigInt(id)],
    });

    if (isLoading || !data) {
        return (
            <Card className="p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </Card>
        );
    }

    const proposal = data as { description: string; voteCount: bigint };
    const votes = proposal.voteCount.toString();

    return (
        <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">Proposition #{id + 1}</h3>
                <span className="text-2xl font-bold">{votes} vote{votes !== '1' ? 's' : ''}</span>
            </div>

            <p className="text-lg mb-4">{proposal.description}</p>

            {/* Barre simple */}
            <div className="w-full bg-gray-300 rounded-full h-12">
                <div
                    className="bg-blue-600 h-full rounded-full flex items-center justify-end pr-4 text-white font-bold"
                    style={{ width: `${(Number(proposal.voteCount) / totalProposals) * 100 || 0}%` }}
                >
                    {votes}
                </div>
            </div>
        </Card>
    );
}