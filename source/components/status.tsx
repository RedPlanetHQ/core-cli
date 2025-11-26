import {Box, Text} from 'ink';
import {memo} from 'react';

import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {useResponsiveTerminal} from '@/hooks/useTerminalWidth';

import {themes, getThemeColors} from '@/config/themes';
import type {ThemePreset} from '@/types/ui';
import type {UpdateInfo} from '@/types/utils';

// Using UpdateInfo from '@/types/utils' for type consistency

export default memo(function Status({
	provider,
	model,
	theme,
	updateInfo,
}: {
	provider: string;
	model: string;
	theme: ThemePreset;
	updateInfo?: UpdateInfo | null;
	agentsMdLoaded?: boolean;
}) {
	const {boxWidth, isNarrow} = useResponsiveTerminal();
	const colors = getThemeColors(theme);

	return (
		<>
			{/* Narrow terminal: simple text without box */}
			{isNarrow ? (
				<Box
					flexDirection="column"
					marginBottom={1}
					borderStyle="round"
					borderColor={colors.info}
					paddingY={1}
					paddingX={2}
				>
					<Text color={colors.success}>
						<Text bold={true}>Model: </Text>
						{model}
					</Text>
					<Text color={colors.primary}>
						<Text bold={true}>Theme: </Text>
						{themes[theme].displayName}
					</Text>

					{updateInfo?.hasUpdate && (
						<>
							<Text color={colors.warning}>
								⚠ v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
							</Text>
							{updateInfo.updateCommand ? (
								<Text color={colors.secondary}>
									↳ Run: /update or {updateInfo.updateCommand}
								</Text>
							) : updateInfo.updateMessage ? (
								<Text color={colors.secondary}>{updateInfo.updateMessage}</Text>
							) : null}
						</>
					)}
				</Box>
			) : (
				/* Normal/Wide terminal: full layout with TitledBox */
				<TitledBox
					key={colors.primary}
					borderStyle="round"
					titles={['Status']}
					titleStyles={titleStyles.pill}
					width={boxWidth}
					borderColor={colors.info}
					paddingX={2}
					paddingY={1}
					flexDirection="column"
					marginBottom={1}
				>
					<Text color={colors.success}>
						<Text bold={true}>Provider: </Text>
						{provider}, <Text bold={true}>Model: </Text>
						{model}
					</Text>
					<Text color={colors.primary}>
						<Text bold={true}>Theme: </Text>
						{themes[theme].displayName}
					</Text>

					{updateInfo?.hasUpdate && (
						<>
							<Text color={colors.warning}>
								<Text bold={true}>Update Available: </Text>v
								{updateInfo.currentVersion} → v{updateInfo.latestVersion}
							</Text>
							{updateInfo.updateCommand ? (
								<Text color={colors.secondary}>
									↳ Run: /update or {updateInfo.updateCommand}
								</Text>
							) : updateInfo.updateMessage ? (
								<Text color={colors.secondary}>{updateInfo.updateMessage}</Text>
							) : null}
						</>
					)}
				</TitledBox>
			)}
		</>
	);
});
