import type { Environment, Organization, SourceFile, VpnGuide } from './types';

export type ConnectionGuideRow = {
  key: string;
  organizationCode: string;
  organizationName: string;
  guide: VpnGuide;
  usedBy: number;
  requestRequired: boolean;
};

export type ConnectionSourceFileRow = {
  key: string;
  organizationCode: string;
  organizationName: string;
  guideName: string;
  file: SourceFile;
};

export type ConnectionSummary = {
  total: number;
  direct: number;
  vpn: number;
  dedicated: number;
  guides: ConnectionGuideRow[];
  files: ConnectionSourceFileRow[];
};

export function buildConnectionSummary(organizations: Organization[]): ConnectionSummary {
  const environments = organizations.flatMap((org) => org.environments || []);
  const dedicatedEnvs = environments.filter(isDedicatedLineEnvironment);
  const vpnEnvs = environments.filter((env) => !isDedicatedLineEnvironment(env) && isVpnEnvironment(env));
  const directEnvs = environments.filter((env) => !isDedicatedLineEnvironment(env) && !isVpnEnvironment(env));
  const guides = organizations.flatMap((org) => (org.vpnGuides || []).map((guide) => {
    const usedBy = (org.environments || []).filter((env) => environmentUsesGuide(env, guide)).length;
    return {
      key: `${org.id}-${guide.id}`,
      organizationCode: org.code,
      organizationName: org.name,
      guide,
      usedBy,
      requestRequired: hasRequestRequiredTag(guide),
    };
  }));
  const files = guides.flatMap((row) => (row.guide.sourceFiles || []).map((file) => ({
    key: `${row.key}-${file.id || file.sha256 || file.filename}`,
    organizationCode: row.organizationCode,
    organizationName: row.organizationName,
    guideName: row.guide.name,
    file,
  })));

  return {
    total: environments.length,
    direct: directEnvs.length,
    vpn: vpnEnvs.length,
    dedicated: dedicatedEnvs.length,
    guides,
    files,
  };
}

export function isVpnEnvironment(env: Environment): boolean {
  return Boolean(env.vpn_required || env.vpn_guide_id || env.vpnGuide || hasTag(env, ['vpn', '需vpn', '要vpn', 'vpn必須', 'vpn必需']));
}

export function isDedicatedLineEnvironment(env: Environment): boolean {
  return hasTag(env, ['専用線', '专线', '專線', 'leased line', 'private line', 'dedicated line']);
}

function environmentUsesGuide(env: Environment, guide: VpnGuide): boolean {
  return env.vpn_guide_id === guide.id || env.vpnGuide?.id === guide.id;
}

function hasRequestRequiredTag(guide: VpnGuide): boolean {
  return (guide.tags || []).some((tag) => {
    const normalized = tag.trim().toLowerCase();
    return normalized.includes('申請') || normalized.includes('申请') || normalized.includes('必要') || normalized.includes('request');
  });
}

function hasTag(env: Environment, needles: string[]): boolean {
  return (env.tags || []).some((tag) => {
    const normalized = tag.name.trim().toLowerCase();
    return needles.some((needle) => normalized.includes(needle.toLowerCase()));
  });
}
