{
"design_tokens": {
"colors": {
"brand": {
"primary": "#FF5C00",
"primary_variant": "rgba(255, 92, 0, 0.1)"
},
"neutral": {
"background": "#050505",
"surface_low": "#121212",
"surface_medium": "#1A1A1A",
"surface_high": "#242424",
"border": "#282828"
},
"text": {
"on_background_high": "#FFFFFF",
"on_background_medium": "#8A8A8A",
"on_primary": "#FFFFFF"
}
},
"typography": {
"font_family": "Inter, system-ui, sans-serif",
"scales": {
"display": { "size": "32px", "weight": "800", "letter_spacing": "-0.02em" },
"heading": { "size": "20px", "weight": "700" },
"body_large": { "size": "16px", "weight": "500" },
"body_main": { "size": "14px", "weight": "400" },
"caption": { "size": "12px", "weight": "400" }
}
},
"geometry": {
"border_radius": {
"outer_container": "24px",
"card": "16px",
"interactive_element": "12px",
"circular": "50%"
},
"border_width": {
"default": "1px",
"active": "2px"
}
},
"spacing": {
"section_gap": "32px",
"card_padding": "20px",
"element_gap": "12px"
}
},
"component_library": {
"step_indicator": {
"shape": "circle",
"size": "32px",
"states": { "active": "brand.primary", "inactive": "neutral.surface_high" }
},
"content_card": {
"background": "neutral.surface_low",
"border": "neutral.border",
"states": {
"selected": {
"border": "brand.primary",
"shadow": "0 0 15px rgba(255, 92, 0, 0.2)"
}
}
},
"action_button": {
"type": "filled",
"background": "brand.primary",
"text_color": "text.on_primary",
"border_radius": "geometry.border_radius.interactive_element"
},
"status_badge": {
"size": "small",
"icon_color": "brand.primary",
"background": "neutral.surface_medium"
}
}
}
