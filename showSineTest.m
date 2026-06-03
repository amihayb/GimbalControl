%% Traverse & Elevation - Midline + Friction Analysis
figure;
tiledlayout(2,2);

poly_deg = 5; % adjust to taste

%% ========== TRAVERSE ==========
angle   = T.Tr_Angle_deg;
current = T.Tr_Current_A;

[~, turn_idx] = max(abs(angle));

angle_fwd   = angle(1:turn_idx);     current_fwd   = current(1:turn_idx);
angle_bwd   = angle(turn_idx:end);   current_bwd   = current(turn_idx:end);

bin_edges   = linspace(min(angle), max(angle), 200);
bin_centers = (bin_edges(1:end-1) + bin_edges(2:end)) / 2;
n_bins      = length(bin_centers);

mean_fwd = NaN(1, n_bins);
mean_bwd = NaN(1, n_bins);

for i = 1:n_bins
    mf = angle_fwd >= bin_edges(i) & angle_fwd < bin_edges(i+1);
    mb = angle_bwd >= bin_edges(i) & angle_bwd < bin_edges(i+1);
    if sum(mf) >= 1, mean_fwd(i) = mean(current_fwd(mf)); end
    if sum(mb) >= 1, mean_bwd(i) = mean(current_bwd(mb)); end
end

% Raw midline then polynomial fit to it
% raw_midline = (mean_fwd + mean_bwd) / 2;
% valid = ~isnan(raw_midline);
% p_mid = polyfit(bin_centers(valid), raw_midline(valid), poly_deg);
% midline = polyval(p_mid, bin_centers);

% --- TRAVERSE midline ---
raw_midline = (mean_fwd + mean_bwd) / 2;
win = 30; % adjust: larger = smoother
midline = movmean(raw_midline, win, 'omitnan');

diff_fwd = abs(mean_fwd - midline);
diff_bwd = abs(mean_bwd - midline);

% --- TOP LEFT ---
ax1 = nexttile(1);
plot(ax1, angle_fwd, current_fwd, 'Color', [1 0.6 0.6 0.4], 'LineWidth', 0.5); hold(ax1,'on');
plot(ax1, angle_bwd, current_bwd, 'Color', [0.6 0.8 1 0.4], 'LineWidth', 0.5);
plot(ax1, bin_centers, mean_fwd, '--', 'Color', [0.8 0.2 0.2], 'LineWidth', 1.5);
plot(ax1, bin_centers, mean_bwd, '--', 'Color', [0.2 0.5 0.8], 'LineWidth', 1.5);
plot(ax1, bin_centers, midline,  'k',  'LineWidth', 2);
xlabel(ax1, 'Traverse Angle [deg]');
ylabel(ax1, 'Current [A]');
title(ax1,  'Traverse – Raw & Midline');
legend(ax1, 'Raw fwd','Raw bwd','Forward mean','Backward mean','Midline fit','Location','best');
grid(ax1, 'on');

% --- BOTTOM LEFT ---
ax3 = nexttile(3);
plot(ax3, bin_centers, diff_fwd, 'Color', [0.8 0.2 0.2], 'LineWidth', 1.5); hold(ax3,'on');
plot(ax3, bin_centers, diff_bwd, 'Color', [0.2 0.5 0.8], 'LineWidth', 1.5);
yline(ax3, mean(diff_fwd,'omitnan'), '--', 'Color', [0.8 0.2 0.2], 'LineWidth', 1);
yline(ax3, mean(diff_bwd,'omitnan'), '--', 'Color', [0.2 0.5 0.8], 'LineWidth', 1);
xlabel(ax3, 'Traverse Angle [deg]');
ylabel(ax3, '|\DeltaCurrent| [A]');
title(ax3,  'Traverse – |Deviation from Midline|');
legend(ax3, 'Forward','Backward',...
    sprintf('Fwd mean = %.4f A', mean(diff_fwd,'omitnan')),...
    sprintf('Bwd mean = %.4f A', mean(diff_bwd,'omitnan')),...
    'Location','best');
grid(ax3, 'on');

%% ========== ELEVATION ==========
angle2   = T.El_Angle_deg;
current2 = T.El_Current_A;

[~, turn_idx2] = max(abs(angle2));

angle_fwd2   = angle2(1:turn_idx2);     current_fwd2 = current2(1:turn_idx2);
angle_bwd2   = angle2(turn_idx2:end);   current_bwd2 = current2(turn_idx2:end);

bin_edges2   = linspace(min(angle2), max(angle2), 200);
bin_centers2 = (bin_edges2(1:end-1) + bin_edges2(2:end)) / 2;
n_bins2      = length(bin_centers2);

mean_fwd2 = NaN(1, n_bins2);
mean_bwd2 = NaN(1, n_bins2);

for i = 1:n_bins2
    mf = angle_fwd2 >= bin_edges2(i) & angle_fwd2 < bin_edges2(i+1);
    mb = angle_bwd2 >= bin_edges2(i) & angle_bwd2 < bin_edges2(i+1);
    if sum(mf) >= 1, mean_fwd2(i) = mean(current_fwd2(mf)); end
    if sum(mb) >= 1, mean_bwd2(i) = mean(current_bwd2(mb)); end
end

% raw_midline2 = (mean_fwd2 + mean_bwd2) / 2;
% valid2 = ~isnan(raw_midline2);
% p_mid2 = polyfit(bin_centers2(valid2), raw_midline2(valid2), poly_deg);
% midline2 = polyval(p_mid2, bin_centers2);
raw_midline2 = (mean_fwd2 + mean_bwd2) / 2;
midline2 = movmean(raw_midline2, win, 'omitnan');

diff_fwd2 = abs(mean_fwd2 - midline2);
diff_bwd2 = abs(mean_bwd2 - midline2);

% --- TOP RIGHT ---
ax2 = nexttile(2);
plot(ax2, angle_fwd2, current_fwd2, 'Color', [1 0.6 0.6 0.4], 'LineWidth', 0.5); hold(ax2,'on');
plot(ax2, angle_bwd2, current_bwd2, 'Color', [0.6 0.8 1 0.4], 'LineWidth', 0.5);
plot(ax2, bin_centers2, mean_fwd2, '--', 'Color', [0.8 0.2 0.2], 'LineWidth', 1.5);
plot(ax2, bin_centers2, mean_bwd2, '--', 'Color', [0.2 0.5 0.8], 'LineWidth', 1.5);
plot(ax2, bin_centers2, midline2,  'k',  'LineWidth', 2);
xlabel(ax2, 'Elevation Angle [deg]');
ylabel(ax2, 'Current [A]');
title(ax2,  'Elevation – Raw & Midline');
legend(ax2, 'Raw fwd','Raw bwd','Forward mean','Backward mean','Midline fit','Location','best');
grid(ax2, 'on');

% --- BOTTOM RIGHT ---
ax4 = nexttile(4);
plot(ax4, bin_centers2, diff_fwd2, 'Color', [0.8 0.2 0.2], 'LineWidth', 1.5); hold(ax4,'on');
plot(ax4, bin_centers2, diff_bwd2, 'Color', [0.2 0.5 0.8], 'LineWidth', 1.5);
yline(ax4, mean(diff_fwd2,'omitnan'), '--', 'Color', [0.8 0.2 0.2], 'LineWidth', 1);
yline(ax4, mean(diff_bwd2,'omitnan'), '--', 'Color', [0.2 0.5 0.8], 'LineWidth', 1);
xlabel(ax4, 'Elevation Angle [deg]');
ylabel(ax4, '|\DeltaCurrent| [A]');
title(ax4,  'Elevation – |Deviation from Midline|');
legend(ax4, 'Forward','Backward',...
    sprintf('Fwd mean = %.4f A', mean(diff_fwd2,'omitnan')),...
    sprintf('Bwd mean = %.4f A', mean(diff_bwd2,'omitnan')),...
    'Location','best');
grid(ax4, 'on');

%% Summary
fprintf('\n=== Friction Summary ===\n');
fprintf('Traverse:  Forward = %.4f A  |  Backward = %.4f A\n', ...
    mean(diff_fwd,'omitnan'), mean(diff_bwd,'omitnan'));
fprintf('Elevation: Forward = %.4f A  |  Backward = %.4f A\n', ...
    mean(diff_fwd2,'omitnan'), mean(diff_bwd2,'omitnan'));