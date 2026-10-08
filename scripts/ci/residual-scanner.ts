/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : CI
 * File           : residual-scanner.ts
 * Version        : 1.0.0
 * Author         : CI Residual Scanner Engineer
 * Organization   : Corporate
 * Created Date   : 2026-10-08
 * Last Modified  : 2026-10-08
 * Classification : INTERNAL
 *
 * Governance:
 * - AI Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Corporate
 * All Rights Reserved.
 ******************************************************************************/

import { EC2Client, DescribeVpcsCommand, DescribeSubnetsCommand, DescribeNetworkInterfacesCommand, DescribeInternetGatewaysCommand } from "@aws-sdk/client-ec2";

async function main() {
    const region = process.env.AWS_REGION || 'us-east-1';
    const client = new EC2Client({ region });
    let residualCount = 0;

    console.log(`[Residual Scanner] Starting scan for residual resources in ${region}...`);

    try {
        // Scan VPCs
        const vpcsData = await client.send(new DescribeVpcsCommand({
            Filters: [{ Name: 'tag-key', Values: ['TransactionId'] }]
        }));
        if (vpcsData.Vpcs && vpcsData.Vpcs.length > 0) {
            console.error(`[Residual Scanner] Found ${vpcsData.Vpcs.length} residual VPCs.`);
            vpcsData.Vpcs.forEach(vpc => console.error(`  - VPC ID: ${vpc.VpcId}`));
            residualCount += vpcsData.Vpcs.length;
        }

        // Scan Subnets
        const subnetsData = await client.send(new DescribeSubnetsCommand({
            Filters: [{ Name: 'tag-key', Values: ['TransactionId'] }]
        }));
        if (subnetsData.Subnets && subnetsData.Subnets.length > 0) {
            console.error(`[Residual Scanner] Found ${subnetsData.Subnets.length} residual Subnets.`);
            subnetsData.Subnets.forEach(subnet => console.error(`  - Subnet ID: ${subnet.SubnetId}`));
            residualCount += subnetsData.Subnets.length;
        }

        // Scan ENIs
        const enisData = await client.send(new DescribeNetworkInterfacesCommand({
            Filters: [{ Name: 'tag-key', Values: ['TransactionId'] }]
        }));
        if (enisData.NetworkInterfaces && enisData.NetworkInterfaces.length > 0) {
            console.error(`[Residual Scanner] Found ${enisData.NetworkInterfaces.length} residual ENIs.`);
            enisData.NetworkInterfaces.forEach(eni => console.error(`  - ENI ID: ${eni.NetworkInterfaceId}`));
            residualCount += enisData.NetworkInterfaces.length;
        }

        // Scan IGWs
        const igwsData = await client.send(new DescribeInternetGatewaysCommand({
            Filters: [{ Name: 'tag-key', Values: ['TransactionId'] }]
        }));
        if (igwsData.InternetGateways && igwsData.InternetGateways.length > 0) {
            console.error(`[Residual Scanner] Found ${igwsData.InternetGateways.length} residual IGWs.`);
            igwsData.InternetGateways.forEach(igw => console.error(`  - IGW ID: ${igw.InternetGatewayId}`));
            residualCount += igwsData.InternetGateways.length;
        }

        if (residualCount > 0) {
            console.error(`\n[Residual Scanner] FAILED: Found ${residualCount} residual resources. This is a violation of zero-residual cleanup.`);
            process.exit(1);
        } else {
            console.log(`\n[Residual Scanner] SUCCESS: Zero residual resources cleanup verified.`);
            process.exit(0);
        }

    } catch (error) {
        console.error(`[Residual Scanner] Error during scan: ${error}`);
        process.exit(1);
    }
}

main();
