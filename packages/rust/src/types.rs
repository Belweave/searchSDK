use crate::{Error, ErrorCode, Result};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SearchRequest {
    pub query: String,
    #[serde(
        default,
        deserialize_with = "present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub limit: Option<u8>,
    #[serde(
        default,
        deserialize_with = "present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub include_domains: Option<Vec<String>>,
    #[serde(
        default,
        deserialize_with = "present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub exclude_domains: Option<Vec<String>>,
}
pub(crate) fn present_option<'de, D: serde::Deserializer<'de>, T: Deserialize<'de>>(
    d: D,
) -> std::result::Result<Option<T>, D::Error> {
    T::deserialize(d).map(Some)
}
pub(crate) fn required_field<'de, D: serde::Deserializer<'de>, T: Deserialize<'de>>(
    d: D,
) -> std::result::Result<T, D::Error> {
    T::deserialize(d)
}
impl SearchRequest {
    pub fn new(query: impl Into<String>) -> Self {
        Self {
            query: query.into(),
            limit: None,
            include_domains: None,
            exclude_domains: None,
        }
    }
    pub fn from_json(value: serde_json::Value) -> Result<Self> {
        serde_json::from_value::<Self>(value)
            .map_err(|_| Error::new(ErrorCode::InvalidRequest))?
            .validated()
    }
    pub fn validated(mut self) -> Result<Self> {
        let invalid = || Error::new(ErrorCode::InvalidRequest);
        if self.query.trim().is_empty() || !(1..=20).contains(&self.limit.unwrap_or(5)) {
            return Err(invalid());
        }
        for domains in [&mut self.include_domains, &mut self.exclude_domains]
            .into_iter()
            .flatten()
        {
            if domains.is_empty() {
                return Err(invalid());
            }
            let mut unique = Vec::new();
            for d in domains.iter() {
                if !valid_domain(d) {
                    return Err(invalid());
                }
                let d = d.to_ascii_lowercase();
                if !unique.contains(&d) {
                    unique.push(d);
                }
            }
            *domains = unique;
        }
        if self.include_domains.as_ref().is_some_and(|a| {
            self.exclude_domains
                .as_ref()
                .is_some_and(|b| a.iter().any(|x| b.contains(x)))
        }) {
            return Err(invalid());
        }
        self.limit = Some(self.limit.unwrap_or(5));
        Ok(self)
    }
}
fn valid_domain(d: &str) -> bool {
    d.is_ascii()
        && d.len() <= 253
        && d.contains('.')
        && d.split('.').all(|l| {
            !l.is_empty()
                && l.len() <= 63
                && l.as_bytes()[0].is_ascii_alphanumeric()
                && l.as_bytes()[l.len() - 1].is_ascii_alphanumeric()
                && l.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
        })
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Provenance {
    pub provider: String,
    pub source_url: String,
    pub retrieved_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SearchResult {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub highlights: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,
    pub provenance: Provenance,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UsageUnit {
    Usd,
    Credits,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SearchUsage {
    pub unit: UsageUnit,
    pub value: f64,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WarningCode {
    FallbackUsed,
    ProviderWarning,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SearchWarning {
    pub code: WarningCode,
    pub provider: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AttemptOutcome {
    Success,
    Error,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SearchAttempt {
    pub provider: String,
    pub started_at: String,
    pub duration_ms: f64,
    pub outcome: AttemptOutcome,
    #[serde(
        default,
        deserialize_with = "present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub code: Option<ErrorCode>,
    #[serde(
        default,
        deserialize_with = "present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub status: Option<u16>,
    #[serde(
        default,
        deserialize_with = "present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub retry_after_ms: Option<f64>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Reuse {
    Cache,
    Inflight,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct SearchResponse {
    pub provider: String,
    pub results: Vec<SearchResult>,
    pub usage: Option<SearchUsage>,
    pub warnings: Vec<SearchWarning>,
    pub attempts: Vec<SearchAttempt>,
    #[serde(
        default,
        deserialize_with = "present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub reuse: Option<Reuse>,
}
pub(crate) fn valid_id(s: &str) -> bool {
    (1..=64).contains(&s.len())
        && s.bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
}
pub(crate) fn valid_request_id(s: &str) -> bool {
    (1..=256).contains(&s.len())
        && s.bytes()
            .all(|c| c.is_ascii_alphanumeric() || b"_.:/-".contains(&c))
}
pub(crate) fn result_url(s: &str) -> bool {
    !s.chars()
        .any(|c| c.is_whitespace() || c.is_control() || c == '\\')
        && s.split_once("://")
            .is_some_and(|(_, rest)| !rest.starts_with(['/', '\\']))
        && (s.to_ascii_lowercase().starts_with("https://")
            || s.to_ascii_lowercase().starts_with("http://"))
        && url::Url::parse(s).is_ok_and(|u| {
            u.host_str().is_some() && u.username().is_empty() && u.password().is_none()
        })
}
pub(crate) fn timestamp(s: &str) -> bool {
    s.len() >= 20
        && s.as_bytes().get(4) == Some(&b'-')
        && s.as_bytes()[..4].iter().all(u8::is_ascii_digit)
        && time::OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339).is_ok()
}
pub(crate) fn now() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .expect("UTC time formats as RFC3339")
}
impl SearchAttempt {
    pub(crate) fn valid(&self) -> bool {
        valid_id(&self.provider)
            && timestamp(&self.started_at)
            && self.duration_ms.is_finite()
            && self.duration_ms >= 0.0
            && self.status.is_none_or(|s| (100..=599).contains(&s))
            && self
                .retry_after_ms
                .is_none_or(|n| n.is_finite() && n >= 0.0)
    }
}
impl SearchResponse {
    pub fn validate(&self) -> Result<()> {
        let valid = self.attempts.len() <= 1024
            && valid_id(&self.provider)
            && self
                .usage
                .as_ref()
                .is_none_or(|u| u.value.is_finite() && u.value >= 0.0)
            && self.warnings.iter().all(|w| valid_id(&w.provider))
            && self.attempts.iter().all(SearchAttempt::valid)
            && self.results.iter().all(|r| {
                result_url(&r.url)
                    && r.score.is_none_or(f64::is_finite)
                    && valid_id(&r.provenance.provider)
                    && result_url(&r.provenance.source_url)
                    && timestamp(&r.provenance.retrieved_at)
                    && r.provenance
                        .request_id
                        .as_deref()
                        .is_none_or(valid_request_id)
            });
        if valid {
            Ok(())
        } else {
            Err(Error::new(ErrorCode::InvalidResponse))
        }
    }
    pub fn from_json(v: serde_json::Value) -> Result<Self> {
        if v.get("usage").is_none() {
            return Err(Error::new(ErrorCode::InvalidResponse));
        }
        let r: Self =
            serde_json::from_value(v).map_err(|_| Error::new(ErrorCode::InvalidResponse))?;
        r.validate()?;
        Ok(r)
    }
}
